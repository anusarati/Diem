/**
 * Types for the Analysis screen: breakdown, goals, Petri net, heatmap.
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

export type PetriNetPlace = {
	id: string;
	x: number;
	y: number;
	label?: string;
	tokens?: number;
};

export type PetriNetTransition = {
	id: string;
	x: number;
	y: number;
	label?: string;
};

export type PetriNetArc = {
	from: string;
	to: string;
};
