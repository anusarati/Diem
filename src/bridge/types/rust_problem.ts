import type { TimeScope } from "../../types/domain";

export type RustActivityType = "Fixed" | "Floating";

export interface RustFrequencyTarget {
	scope: TimeScope;
	target_count: number;
	weight: number;
}

export interface RustUserFrequencyConstraint {
	scope: TimeScope;
	min_count: number | null;
	max_count: number | null;
	penalty_weight: number;
}

export interface RustBinding {
	required_sets: number[][];
	time_scope: TimeScope;
	valid_weekdays: number;
	weight: number;
}

export interface RustActivity {
	id: number;
	activity_type: RustActivityType;
	duration_slots: number;
	priority: number;
	assigned_start: number | null;
	category_id: number;
	input_bindings: RustBinding[];
	output_bindings: RustBinding[];
	frequency_targets: RustFrequencyTarget[];
	user_frequency_constraints: RustUserFrequencyConstraint[];
}

export type RustGlobalConstraint =
	| {
			ForbiddenZone: {
				start: number;
				end: number;
			};
	  }
	| {
			CumulativeTime: {
				category_id: number | null;
				period_slots: number;
				min_duration: number;
				max_duration: number;
			};
	  };

export type HeatmapEntry = [number, number, number];
export type MarkovEntry = [number, number, number];
export type SolveResultTuple = [number, number];

export interface RustProblem {
	activities: RustActivity[];
	floating_indices: number[];
	fixed_indices: number[];
	global_constraints: RustGlobalConstraint[];
	heatmap: HeatmapEntry[];
	markov_matrix: MarkovEntry[];
	total_slots: number;
}

export interface BuiltProblem {
	problem: RustProblem;
	activityIdToNumeric: Map<string, number>;
	numericToActivityId: Map<number, string>;
	categoryIdToNumeric: Map<string, number>;
	horizonStart: Date;
}
