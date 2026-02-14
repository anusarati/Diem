import type HNetArcCount from "../../data/models/HNetArcCount";
import type HNetPairCount from "../../data/models/HNetPairCount";
import type MarkovTransitionCount from "../../data/models/MarkovTransitionCount";
import type UserBehavior from "../../data/models/UserBehavior";
import {
	BehaviorPeriod,
	HNetPairType,
	HNetTimeScope,
	TimeScope,
	UserBehaviorMetric,
} from "../../types/domain";
import type {
	HeatmapEntry,
	HeuristicNetIR,
	HeuristicNetIRArc,
	HeuristicNetIRBinding,
	MarkovEntry,
	RustActivity,
} from "../types";

export interface HeuristicInjectorOptions {
	minimumSupport?: number;
	dependencyThreshold?: number;
	pairMinimumSupport?: number;
	maxClausesPerBinding?: number;
	softBindingWeightScale?: number;
	markovSmoothingAlpha?: number;
	frequencyWeight?: number;
}

export interface HeuristicInjectorInput {
	activitiesByNumericId: Map<number, RustActivity>;
	activityIdToNumeric: Map<string, number>;
	arcCounts: HNetArcCount[];
	pairCounts: HNetPairCount[];
	markovTransitions: MarkovTransitionCount[];
	userBehavior: UserBehavior[];
}

export interface HeuristicInjectorResult {
	markovMatrix: MarkovEntry[];
	heatmap: HeatmapEntry[];
	hnetIR: HeuristicNetIR;
	warnings: string[];
}

interface ArcCandidate {
	relatedNumericId: number;
	dependencyScore: number;
	support: number;
}

interface ClauseCandidate {
	requiredSet: number[];
	score: number;
}

interface PairLookupRow {
	firstNumericId: number;
	secondNumericId: number;
	support: number;
}

const DEFAULT_OPTIONS: Required<HeuristicInjectorOptions> = {
	minimumSupport: 2,
	dependencyThreshold: 0.1,
	pairMinimumSupport: 2,
	maxClausesPerBinding: 4,
	softBindingWeightScale: 250,
	markovSmoothingAlpha: 1,
	frequencyWeight: 2,
};

const contextKey = (
	activityNumericId: number,
	timeScope: HNetTimeScope,
	weekdayMask: number,
): string => `${activityNumericId}|${timeScope}|${weekdayMask}`;

const normalizeScope = (scope: HNetTimeScope): TimeScope => {
	switch (scope) {
		case HNetTimeScope.SAME_DAY:
			return TimeScope.SAME_DAY;
		case HNetTimeScope.SAME_WEEK:
			return TimeScope.SAME_WEEK;
		case HNetTimeScope.SAME_MONTH:
			return TimeScope.SAME_MONTH;
		default:
			return TimeScope.SAME_DAY;
	}
};

const isClauseSubset = (candidate: number[], existing: number[]): boolean => {
	const existingSet = new Set(existing);
	return candidate.every((item) => existingSet.has(item));
};

const hashClause = (requiredSet: number[]): string =>
	[...requiredSet].sort((a, b) => a - b).join("&");

const mapFrequencyScope = (period: BehaviorPeriod): TimeScope | null => {
	switch (period) {
		case BehaviorPeriod.DAILY:
			return TimeScope.SAME_DAY;
		case BehaviorPeriod.WEEKLY:
			return TimeScope.SAME_WEEK;
		case BehaviorPeriod.MONTHLY:
			return TimeScope.SAME_MONTH;
		default:
			return null;
	}
};

export class HeuristicInjector {
	private readonly options: Required<HeuristicInjectorOptions>;

	constructor(options: HeuristicInjectorOptions = {}) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	inject(input: HeuristicInjectorInput): HeuristicInjectorResult {
		const warnings: string[] = [];
		const markovMatrix = this.buildMarkovMatrix(input, warnings);
		const heatmap = this.buildHeatmap(input, warnings);
		this.injectFrequencyTargets(input, warnings);
		const hnetIR = this.injectBindings(input, warnings);

		return {
			markovMatrix,
			heatmap,
			hnetIR,
			warnings,
		};
	}

	private buildMarkovMatrix(
		input: HeuristicInjectorInput,
		warnings: string[],
	): MarkovEntry[] {
		const grouped = new Map<number, { to: number; count: number }[]>();

		for (const row of input.markovTransitions) {
			const from = input.activityIdToNumeric.get(row.fromActivityId);
			const to = input.activityIdToNumeric.get(row.toActivityId);
			if (from === undefined || to === undefined) {
				warnings.push(
					`Skipping Markov transition with unknown activity IDs: ${row.fromActivityId} -> ${row.toActivityId}`,
				);
				continue;
			}

			const bucket = grouped.get(from);
			if (bucket) {
				bucket.push({ to, count: row.count });
			} else {
				grouped.set(from, [{ to, count: row.count }]);
			}
		}

		const alpha = this.options.markovSmoothingAlpha;
		const entries: MarkovEntry[] = [];

		for (const [from, rows] of grouped.entries()) {
			const total = rows.reduce((acc, row) => acc + row.count, 0);
			const k = rows.length;
			if (k === 0) {
				continue;
			}

			for (const row of rows) {
				const probability = (row.count + alpha) / (total + alpha * k);
				entries.push([from, row.to, probability]);
			}
		}

		return entries;
	}

	private buildHeatmap(
		input: HeuristicInjectorInput,
		warnings: string[],
	): HeatmapEntry[] {
		const entries: HeatmapEntry[] = [];
		for (const row of input.userBehavior) {
			if (row.metric !== UserBehaviorMetric.HEATMAP_PROBABILITY) {
				continue;
			}
			if (!row.activityId) {
				warnings.push(
					`Skipping heatmap metric row without activity_id: ${row.id}`,
				);
				continue;
			}
			const activityNumeric = input.activityIdToNumeric.get(row.activityId);
			if (activityNumeric === undefined) {
				warnings.push(
					`Skipping heatmap row for unknown activity: ${row.activityId}`,
				);
				continue;
			}

			const slot = Number.parseInt(row.keyParam, 10);
			if (!Number.isInteger(slot) || slot < 0) {
				warnings.push(
					`Skipping heatmap row with invalid slot: ${row.keyParam}`,
				);
				continue;
			}

			entries.push([activityNumeric, slot, row.value]);
		}
		return entries;
	}

	private injectFrequencyTargets(
		input: HeuristicInjectorInput,
		warnings: string[],
	): void {
		for (const row of input.userBehavior) {
			if (row.metric !== UserBehaviorMetric.OBSERVED_FREQUENCY) {
				continue;
			}
			if (!row.activityId) {
				warnings.push(
					`Skipping frequency metric row without activity_id: ${row.id}`,
				);
				continue;
			}

			const activityNumeric = input.activityIdToNumeric.get(row.activityId);
			if (activityNumeric === undefined) {
				warnings.push(
					`Skipping frequency row for unknown activity: ${row.activityId}`,
				);
				continue;
			}
			const activity = input.activitiesByNumericId.get(activityNumeric);
			if (!activity) {
				warnings.push(
					`Skipping frequency row for missing mapped activity: ${row.activityId}`,
				);
				continue;
			}

			const scope = mapFrequencyScope(row.period);
			if (!scope) {
				warnings.push(
					`Skipping weekday-specific OBSERVED_FREQUENCY row until Rust frequency targets support weekday masks: ${row.period}`,
				);
				continue;
			}

			activity.frequency_targets.push({
				scope,
				target_count: Math.max(0, Math.round(row.value)),
				weight: this.options.frequencyWeight,
			});
		}
	}

	private injectBindings(
		input: HeuristicInjectorInput,
		warnings: string[],
	): HeuristicNetIR {
		const reverseCount = new Map<string, number>();
		for (const row of input.arcCounts) {
			const predecessor = input.activityIdToNumeric.get(
				row.predecessorActivityId,
			);
			const successor = input.activityIdToNumeric.get(row.successorActivityId);
			if (predecessor === undefined || successor === undefined) {
				continue;
			}
			reverseCount.set(
				`${predecessor}|${successor}|${row.timeScope}|${row.weekdayMask}`,
				row.count,
			);
		}

		const inputCandidates = new Map<string, ArcCandidate[]>();
		const outputCandidates = new Map<string, ArcCandidate[]>();
		const arcs: HeuristicNetIRArc[] = [];

		for (const row of input.arcCounts) {
			const predecessor = input.activityIdToNumeric.get(
				row.predecessorActivityId,
			);
			const successor = input.activityIdToNumeric.get(row.successorActivityId);
			if (predecessor === undefined || successor === undefined) {
				warnings.push(
					`Skipping HNet arc with unknown activity IDs: ${row.predecessorActivityId} -> ${row.successorActivityId}`,
				);
				continue;
			}
			if (row.count < this.options.minimumSupport) {
				continue;
			}

			const reverse =
				reverseCount.get(
					`${successor}|${predecessor}|${row.timeScope}|${row.weekdayMask}`,
				) ?? 0;
			const dependencyScore = (row.count - reverse) / (row.count + reverse + 1);

			if (dependencyScore < this.options.dependencyThreshold) {
				continue;
			}

			arcs.push({
				predecessorId: row.predecessorActivityId,
				successorId: row.successorActivityId,
				timeScope: row.timeScope,
				weekdayMask: row.weekdayMask,
				forwardCount: row.count,
				reverseCount: reverse,
				dependencyScore,
			});

			const inputKey = contextKey(successor, row.timeScope, row.weekdayMask);
			const outputKey = contextKey(predecessor, row.timeScope, row.weekdayMask);

			const inputList = inputCandidates.get(inputKey) ?? [];
			inputList.push({
				relatedNumericId: predecessor,
				dependencyScore,
				support: row.count,
			});
			inputCandidates.set(inputKey, inputList);

			const outputList = outputCandidates.get(outputKey) ?? [];
			outputList.push({
				relatedNumericId: successor,
				dependencyScore,
				support: row.count,
			});
			outputCandidates.set(outputKey, outputList);
		}

		const predecessorPairLookup = this.buildPairLookup(
			input,
			HNetPairType.PREDECESSOR_PAIR,
		);
		const successorPairLookup = this.buildPairLookup(
			input,
			HNetPairType.SUCCESSOR_PAIR,
		);

		const bindings: HeuristicNetIRBinding[] = [];

		for (const [key, candidates] of inputCandidates.entries()) {
			const [activityNumericStr, scopeRaw, weekdayMaskRaw] = key.split("|");
			const activityNumeric = Number.parseInt(activityNumericStr ?? "", 10);
			const weekdayMask = Number.parseInt(weekdayMaskRaw ?? "", 10);
			if (
				!Number.isInteger(activityNumeric) ||
				!Number.isInteger(weekdayMask)
			) {
				continue;
			}
			const activity = input.activitiesByNumericId.get(activityNumeric);
			if (!activity) {
				continue;
			}

			const binding = this.buildBinding(
				activity.id,
				"input",
				normalizeScope(scopeRaw as HNetTimeScope),
				weekdayMask,
				candidates,
				predecessorPairLookup.get(key) ?? [],
			);
			if (!binding) {
				continue;
			}

			activity.input_bindings.push({
				required_sets: binding.requiredSets,
				time_scope: binding.timeScope,
				valid_weekdays: binding.weekdayMask,
				weight: binding.weight,
			});
			bindings.push(binding);
		}

		for (const [key, candidates] of outputCandidates.entries()) {
			const [activityNumericStr, scopeRaw, weekdayMaskRaw] = key.split("|");
			const activityNumeric = Number.parseInt(activityNumericStr ?? "", 10);
			const weekdayMask = Number.parseInt(weekdayMaskRaw ?? "", 10);
			if (
				!Number.isInteger(activityNumeric) ||
				!Number.isInteger(weekdayMask)
			) {
				continue;
			}
			const activity = input.activitiesByNumericId.get(activityNumeric);
			if (!activity) {
				continue;
			}

			const binding = this.buildBinding(
				activity.id,
				"output",
				normalizeScope(scopeRaw as HNetTimeScope),
				weekdayMask,
				candidates,
				successorPairLookup.get(key) ?? [],
			);
			if (!binding) {
				continue;
			}

			activity.output_bindings.push({
				required_sets: binding.requiredSets,
				time_scope: binding.timeScope,
				valid_weekdays: binding.weekdayMask,
				weight: binding.weight,
			});
			bindings.push(binding);
		}

		return { arcs, bindings };
	}

	private buildPairLookup(
		input: HeuristicInjectorInput,
		pairType: HNetPairType,
	): Map<string, PairLookupRow[]> {
		const lookup = new Map<string, PairLookupRow[]>();
		for (const row of input.pairCounts) {
			if (row.pairType !== pairType) {
				continue;
			}
			if (row.coOccurrenceCount < this.options.pairMinimumSupport) {
				continue;
			}
			const anchor = input.activityIdToNumeric.get(row.anchorActivityId);
			const first = input.activityIdToNumeric.get(row.firstActivityId);
			const second = input.activityIdToNumeric.get(row.secondActivityId);
			if (anchor === undefined || first === undefined || second === undefined) {
				continue;
			}

			const key = contextKey(anchor, row.timeScope, row.weekdayMask);
			const bucket = lookup.get(key) ?? [];
			bucket.push({
				firstNumericId: first,
				secondNumericId: second,
				support: row.coOccurrenceCount,
			});
			lookup.set(key, bucket);
		}

		return lookup;
	}

	private buildBinding(
		activityNumericId: number,
		direction: "input" | "output",
		timeScope: TimeScope,
		weekdayMask: number,
		candidates: ArcCandidate[],
		pairRows: PairLookupRow[],
	): HeuristicNetIRBinding | null {
		if (candidates.length === 0) {
			return null;
		}

		const candidateMap = new Map<number, ArcCandidate>();
		for (const candidate of candidates) {
			const existing = candidateMap.get(candidate.relatedNumericId);
			if (!existing || existing.dependencyScore < candidate.dependencyScore) {
				candidateMap.set(candidate.relatedNumericId, candidate);
			}
		}

		const clauses: ClauseCandidate[] = [];
		for (const candidate of candidateMap.values()) {
			clauses.push({
				requiredSet: [candidate.relatedNumericId],
				score: candidate.dependencyScore,
			});
		}

		for (const pair of pairRows) {
			const first = candidateMap.get(pair.firstNumericId);
			const second = candidateMap.get(pair.secondNumericId);
			if (!first || !second) {
				continue;
			}

			const score =
				(first.dependencyScore + second.dependencyScore) / 2 +
				pair.support / Math.max(1, first.support + second.support);
			clauses.push({
				requiredSet: [pair.firstNumericId, pair.secondNumericId],
				score,
			});
		}

		clauses.sort((left, right) => {
			if (right.score !== left.score) {
				return right.score - left.score;
			}
			return left.requiredSet.length - right.requiredSet.length;
		});

		const selected: ClauseCandidate[] = [];
		const seen = new Set<string>();

		for (const clause of clauses) {
			if (selected.length >= this.options.maxClausesPerBinding) {
				break;
			}

			const sortedClause = [...clause.requiredSet].sort((a, b) => a - b);
			const key = hashClause(sortedClause);
			if (seen.has(key)) {
				continue;
			}

			let redundant = false;
			for (const existing of selected) {
				if (isClauseSubset(existing.requiredSet, sortedClause)) {
					redundant = true;
					break;
				}
			}
			if (redundant) {
				continue;
			}

			seen.add(key);
			selected.push({
				requiredSet: sortedClause,
				score: clause.score,
			});
		}

		if (selected.length === 0) {
			return null;
		}

		const confidence =
			selected.reduce((acc, clause) => acc + clause.score, 0) / selected.length;
		const weight = Math.max(
			10,
			confidence * this.options.softBindingWeightScale,
		);

		return {
			activityNumericId,
			direction,
			timeScope,
			weekdayMask,
			requiredSets: selected.map((item) => item.requiredSet),
			weight,
			confidence,
		};
	}
}
