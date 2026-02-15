import type { MarkovTransitionRepository } from "../../data/repositories";
import {
	assertCompletedActivityEventBatch,
	type CompletedActivityEvent,
	type MarkovTransitionCountUpdate,
} from "../types";

export interface MarkovTransitionMinerOptions {
	gapToleranceSlots?: number;
	slotMinutes?: number;
}

const DEFAULT_SLOT_MINUTES = 15;
const DEFAULT_GAP_TOLERANCE_SLOTS = 2;

export class MarkovTransitionMiner {
	private readonly gapToleranceSlots: number;
	private readonly slotMinutes: number;

	constructor(options: MarkovTransitionMinerOptions = {}) {
		this.gapToleranceSlots =
			options.gapToleranceSlots ?? DEFAULT_GAP_TOLERANCE_SLOTS;
		this.slotMinutes = options.slotMinutes ?? DEFAULT_SLOT_MINUTES;
	}

	mineCounts(events: CompletedActivityEvent[]): MarkovTransitionCountUpdate[] {
		assertCompletedActivityEventBatch(events, "MarkovTransitionMiner.events");

		const sorted = [...events].sort(
			(a, b) => a.startTime.getTime() - b.startTime.getTime(),
		);

		const accumulator = new Map<string, MarkovTransitionCountUpdate>();

		for (let index = 0; index < sorted.length - 1; index += 1) {
			const current = sorted[index];
			const next = sorted[index + 1];

			if (!current || !next) {
				continue;
			}

			const currentEndMs =
				current.startTime.getTime() + current.durationMinutes * 60_000;
			const gapMinutes = (next.startTime.getTime() - currentEndMs) / 60_000;
			const gapSlots = Math.floor(gapMinutes / this.slotMinutes);
			if (gapSlots < 0 || gapSlots > this.gapToleranceSlots) {
				continue;
			}

			const key = `${current.activityId}=>${next.activityId}`;
			const existing = accumulator.get(key);
			if (existing) {
				existing.count += 1;
				existing.lastObservedAt = next.startTime;
				continue;
			}

			accumulator.set(key, {
				fromActivityId: current.activityId,
				toActivityId: next.activityId,
				count: 1,
				lastObservedAt: next.startTime,
			});
		}

		return Array.from(accumulator.values());
	}

	async persist(
		events: CompletedActivityEvent[],
		repository: MarkovTransitionRepository,
	): Promise<MarkovTransitionCountUpdate[]> {
		const updates = this.mineCounts(events);
		for (const update of updates) {
			await repository.incrementTransition(
				update.fromActivityId,
				update.toActivityId,
				update.lastObservedAt,
				update.count,
			);
		}
		return updates;
	}
}
