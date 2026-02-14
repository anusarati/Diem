import {
	getWeekdayMondayIndex,
	weekdayToMask,
} from "../../bridge/assembly/time_slots";
import type {
	HeuristicNetArcRepository,
	HeuristicNetPairRepository,
} from "../../data/repositories";
import { HNetPairType, HNetTimeScope } from "../../types/domain";
import type {
	CompletedActivityEvent,
	HNetArcCountUpdate,
	HNetPairCountUpdate,
	MinedHeuristicBatch,
} from "../types";
import { assertCompletedActivityEventBatch } from "../types";

export interface HeuristicNetMinerOptions {
	maxLookaheadPerBucket?: number;
}

interface EnrichedEvent extends CompletedActivityEvent {
	weekdayMask: number;
	dayBucket: string;
	weekBucket: string;
	monthBucket: string;
}

const dayKey = (date: Date): string => {
	return date.toISOString().slice(0, 10);
};

const weekKey = (date: Date): string => {
	const utc = new Date(date);
	const weekday = getWeekdayMondayIndex(utc);
	const monday = new Date(
		Date.UTC(
			utc.getUTCFullYear(),
			utc.getUTCMonth(),
			utc.getUTCDate() - weekday,
		),
	);
	return monday.toISOString().slice(0, 10);
};

const monthKey = (date: Date): string => {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth() + 1;
	return `${year}-${String(month).padStart(2, "0")}`;
};

const pairKey = (
	anchorId: string,
	firstId: string,
	secondId: string,
	pairType: HNetPairType,
	timeScope: HNetTimeScope,
	weekdayMask: number,
): string => {
	const ordered =
		firstId <= secondId ? [firstId, secondId] : [secondId, firstId];
	return [
		anchorId,
		ordered[0],
		ordered[1],
		pairType,
		timeScope,
		weekdayMask,
	].join("|");
};

export class HeuristicNetMiner {
	private readonly maxLookaheadPerBucket: number;

	constructor(options: HeuristicNetMinerOptions = {}) {
		this.maxLookaheadPerBucket = options.maxLookaheadPerBucket ?? 256;
	}

	mineCounts(events: CompletedActivityEvent[]): MinedHeuristicBatch {
		assertCompletedActivityEventBatch(events, "HeuristicNetMiner.events");

		const sorted = [...events]
			.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
			.map<EnrichedEvent>((event) => ({
				...event,
				weekdayMask: weekdayToMask(getWeekdayMondayIndex(event.startTime)),
				dayBucket: dayKey(event.startTime),
				weekBucket: weekKey(event.startTime),
				monthBucket: monthKey(event.startTime),
			}));

		const arcAccumulator = new Map<string, HNetArcCountUpdate>();
		const pairAccumulator = new Map<string, HNetPairCountUpdate>();

		this.mineScope(
			sorted,
			HNetTimeScope.SAME_DAY,
			(event) => event.dayBucket,
			arcAccumulator,
			pairAccumulator,
		);
		this.mineScope(
			sorted,
			HNetTimeScope.SAME_WEEK,
			(event) => event.weekBucket,
			arcAccumulator,
			pairAccumulator,
		);
		this.mineScope(
			sorted,
			HNetTimeScope.SAME_MONTH,
			(event) => event.monthBucket,
			arcAccumulator,
			pairAccumulator,
		);

		return {
			arcs: Array.from(arcAccumulator.values()),
			pairs: Array.from(pairAccumulator.values()),
		};
	}

	async persist(
		events: CompletedActivityEvent[],
		arcRepository: HeuristicNetArcRepository,
		pairRepository: HeuristicNetPairRepository,
	): Promise<MinedHeuristicBatch> {
		const mined = this.mineCounts(events);

		for (const arc of mined.arcs) {
			await arcRepository.incrementArc(
				arc.predecessorActivityId,
				arc.successorActivityId,
				arc.timeScope,
				arc.weekdayMask,
				arc.lastObservedAt,
				arc.count,
			);
		}

		for (const pair of mined.pairs) {
			await pairRepository.incrementPair(
				pair.anchorActivityId,
				pair.firstActivityId,
				pair.secondActivityId,
				pair.pairType,
				pair.timeScope,
				pair.weekdayMask,
				pair.lastObservedAt,
				pair.coOccurrenceCount,
				pair.anchorSampleSize,
			);
		}

		return mined;
	}

	private mineScope(
		events: EnrichedEvent[],
		timeScope: HNetTimeScope,
		bucketSelector: (event: EnrichedEvent) => string,
		arcAccumulator: Map<string, HNetArcCountUpdate>,
		pairAccumulator: Map<string, HNetPairCountUpdate>,
	): void {
		const bucketMap = new Map<string, EnrichedEvent[]>();
		for (const event of events) {
			const bucket = bucketSelector(event);
			const existing = bucketMap.get(bucket);
			if (existing) {
				existing.push(event);
			} else {
				bucketMap.set(bucket, [event]);
			}
		}

		for (const bucketEvents of bucketMap.values()) {
			bucketEvents.sort(
				(a, b) => a.startTime.getTime() - b.startTime.getTime(),
			);
			this.mineBucket(bucketEvents, timeScope, arcAccumulator, pairAccumulator);
		}
	}

	private mineBucket(
		bucketEvents: EnrichedEvent[],
		timeScope: HNetTimeScope,
		arcAccumulator: Map<string, HNetArcCountUpdate>,
		pairAccumulator: Map<string, HNetPairCountUpdate>,
	): void {
		for (
			let targetIndex = 0;
			targetIndex < bucketEvents.length;
			targetIndex += 1
		) {
			const target = bucketEvents[targetIndex];
			if (!target) {
				continue;
			}

			const predecessorSet = new Set<string>();
			const predecessorCutoff = Math.max(
				0,
				targetIndex - this.maxLookaheadPerBucket,
			);

			for (
				let predecessorIndex = predecessorCutoff;
				predecessorIndex < targetIndex;
				predecessorIndex += 1
			) {
				const predecessor = bucketEvents[predecessorIndex];
				if (!predecessor) {
					continue;
				}

				predecessorSet.add(predecessor.activityId);
				const arcKey = [
					predecessor.activityId,
					target.activityId,
					timeScope,
					target.weekdayMask,
				].join("|");

				const existingArc = arcAccumulator.get(arcKey);
				if (existingArc) {
					existingArc.count += 1;
					existingArc.lastObservedAt = target.startTime;
				} else {
					arcAccumulator.set(arcKey, {
						predecessorActivityId: predecessor.activityId,
						successorActivityId: target.activityId,
						timeScope,
						weekdayMask: target.weekdayMask,
						count: 1,
						lastObservedAt: target.startTime,
					});
				}
			}

			const predecessors = Array.from(predecessorSet);
			for (let i = 0; i < predecessors.length; i += 1) {
				for (let j = i + 1; j < predecessors.length; j += 1) {
					const first = predecessors[i];
					const second = predecessors[j];
					if (!first || !second) {
						continue;
					}
					this.incrementPairAccumulator(
						pairAccumulator,
						target.activityId,
						first,
						second,
						HNetPairType.PREDECESSOR_PAIR,
						timeScope,
						target.weekdayMask,
						target.startTime,
					);
				}
			}
		}

		for (
			let sourceIndex = 0;
			sourceIndex < bucketEvents.length;
			sourceIndex += 1
		) {
			const source = bucketEvents[sourceIndex];
			if (!source) {
				continue;
			}

			const successorSet = new Set<string>();
			const endExclusive = Math.min(
				bucketEvents.length,
				sourceIndex + this.maxLookaheadPerBucket,
			);

			for (
				let successorIndex = sourceIndex + 1;
				successorIndex < endExclusive;
				successorIndex += 1
			) {
				const successor = bucketEvents[successorIndex];
				if (!successor) {
					continue;
				}
				successorSet.add(successor.activityId);
			}

			const successors = Array.from(successorSet);
			for (let i = 0; i < successors.length; i += 1) {
				for (let j = i + 1; j < successors.length; j += 1) {
					const first = successors[i];
					const second = successors[j];
					if (!first || !second) {
						continue;
					}
					this.incrementPairAccumulator(
						pairAccumulator,
						source.activityId,
						first,
						second,
						HNetPairType.SUCCESSOR_PAIR,
						timeScope,
						source.weekdayMask,
						source.startTime,
					);
				}
			}
		}
	}

	private incrementPairAccumulator(
		pairAccumulator: Map<string, HNetPairCountUpdate>,
		anchorId: string,
		firstId: string,
		secondId: string,
		pairType: HNetPairType,
		timeScope: HNetTimeScope,
		weekdayMask: number,
		observedAt: Date,
	): void {
		const key = pairKey(
			anchorId,
			firstId,
			secondId,
			pairType,
			timeScope,
			weekdayMask,
		);
		const existing = pairAccumulator.get(key);
		if (existing) {
			existing.coOccurrenceCount += 1;
			existing.anchorSampleSize += 1;
			existing.lastObservedAt = observedAt;
			return;
		}

		const ordered =
			firstId <= secondId ? [firstId, secondId] : [secondId, firstId];
		pairAccumulator.set(key, {
			anchorActivityId: anchorId,
			firstActivityId: ordered[0] ?? firstId,
			secondActivityId: ordered[1] ?? secondId,
			pairType,
			timeScope,
			weekdayMask,
			coOccurrenceCount: 1,
			anchorSampleSize: 1,
			lastObservedAt: observedAt,
		});
	}
}
