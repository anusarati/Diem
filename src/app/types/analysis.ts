/**
 * Types for the Analysis screen: breakdown, goals, causal net, heatmap.
 * Use these when passing data into analysis components or loading from DB.
 */

export type ActivityBreakdownItem = {
	label: string;
	value: string;
	color: string;
	percent: number;
};

export type GoalTimeData = {
	id: string;
	label: string;
	targetMinutes: number;
	completedMinutes: number;
	projectedMinutes: number;
	onTrack: boolean;
};

/** @deprecated Use CausalNetNode/CausalNetEdge and CausalNetView for activity-based scheduling model. */
export type PetriNetPlace = {
	id: string;
	x: number;
	y: number;
	label?: string;
	tokens?: number;
};

/** @deprecated Use CausalNetNode/CausalNetEdge and CausalNetView. */
export type PetriNetTransition = {
	id: string;
	x: number;
	y: number;
	label?: string;
};

/** @deprecated Use CausalNetEdge and CausalNetView. */
export type PetriNetArc = {
	from: string;
	to: string;
};

/** Causal net: nodes are activities, edges are causal dependencies. */
export type CausalNetNode = {
	id: string;
	/** Display label for the activity (e.g. from Activity.name or category). */
	activityLabel: string;
	x: number;
	y: number;
};

export type CausalNetEdge = {
	from: string;
	to: string;
};

/** Per-category heatmap: likelihood of doing this category in each (day, time) slot. */
export type CategoryHeatmapOption = {
	id: string;
	label: string;
};

export type HeatmapDataByCategory = Record<string, number[][]>;
