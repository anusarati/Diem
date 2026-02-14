/**
 * Sample/demo data for the app. Use for development and as fallback when no real data.
 * Replace with data from WatermelonDB or API when wiring the app.
 */

import { colors } from "../theme";
import type {
	ActivityBreakdownItem,
	GoalTimeData,
	PetriNetArc,
	PetriNetPlace,
	PetriNetTransition,
} from "../types";

export const sampleActivityBreakdown: ActivityBreakdownItem[] = [
	{ label: "Work", value: "2h 45m", color: colors.peachDark, percent: 45 },
	{ label: "Study", value: "1h 15m", color: colors.mintDark, percent: 20 },
	{
		label: "Exercise",
		value: "0h 50m",
		color: colors.lavenderDark,
		percent: 15,
	},
	{
		label: "Leisure",
		value: "1h 30m",
		color: colors.softPinkDark,
		percent: 20,
	},
];

export const sampleMagicHours = [
	0.6, 0.8, 1, 1, 0.4, 0.3, 0.2, 0.15, 0.1, 0.05, 0.05, 0.05,
];

export const sampleGoalTimeData: GoalTimeData[] = [
	{
		id: "1",
		label: "Work",
		targetMinutes: 600,
		completedMinutes: 165,
		projectedMinutes: 580,
		onTrack: true,
	},
	{
		id: "2",
		label: "Study",
		targetMinutes: 300,
		completedMinutes: 75,
		projectedMinutes: 320,
		onTrack: true,
	},
	{
		id: "3",
		label: "Exercise",
		targetMinutes: 150,
		completedMinutes: 50,
		projectedMinutes: 140,
		onTrack: false,
	},
];

export const samplePetriPlaces: PetriNetPlace[] = [
	{ id: "p1", x: 60, y: 100, tokens: 1 },
	{ id: "p2", x: 160, y: 50 },
	{ id: "p3", x: 160, y: 150 },
	{ id: "p4", x: 260, y: 100, tokens: 1 },
];

export const samplePetriTransitions: PetriNetTransition[] = [
	{ id: "t1", x: 110, y: 100 },
	{ id: "t2", x: 210, y: 100 },
];

export const samplePetriArcs: PetriNetArc[] = [
	{ from: "p1", to: "t1" },
	{ from: "t1", to: "p2" },
	{ from: "t1", to: "p3" },
	{ from: "p2", to: "t2" },
	{ from: "p3", to: "t2" },
	{ from: "t2", to: "p4" },
];

/** 7 days × 12 time slots; value 0–1 = intensity. */
export const sampleHeatmapData: number[][] = [
	[0.1, 0.2, 0.7, 0.9, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0],
	[0.1, 0.3, 0.8, 0.85, 0.75, 0.6, 0.5, 0.35, 0.25, 0.15, 0.1, 0],
	[0.05, 0.2, 0.65, 0.9, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2, 0.1, 0],
	[0.1, 0.25, 0.7, 0.88, 0.8, 0.65, 0.5, 0.4, 0.3, 0.2, 0.1, 0],
	[0.15, 0.3, 0.75, 0.82, 0.7, 0.55, 0.45, 0.35, 0.25, 0.15, 0.1, 0],
	[0.2, 0.4, 0.5, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2, 0.2, 0.15, 0.1],
	[0.1, 0.2, 0.3, 0.35, 0.3, 0.25, 0.2, 0.2, 0.15, 0.15, 0.1, 0.05],
];
