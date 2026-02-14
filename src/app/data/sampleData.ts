/**
 * Sample/demo data for the app. Use for development and as fallback when no real data.
 * Replace with data from WatermelonDB or API when wiring the app.
 */

import { colors } from "../theme";
import type {
	ActivityBreakdownItem,
	ActivityItem,
	CategoryHeatmapOption,
	CausalNetEdge,
	CausalNetNode,
	GoalTimeData,
	HeatmapDataByCategory,
} from "../types";

/** Sample activity list for Home "intentions". Replace with DB/API when wiring the app. */
export const sampleActivityItems: ActivityItem[] = [
	{
		id: "1",
		title: "Morning Meditation",
		subtitle: "10 mins • Self-care",
		icon: "self_improvement",
		iconBg: "marshmallow",
		completed: true,
	},
	{
		id: "2",
		title: "Draft Project Proposal",
		subtitle: "2 hours • Work",
		icon: "edit_note",
		iconBg: "primary",
		completed: false,
	},
	{
		id: "3",
		title: "Water the plants",
		subtitle: "5 mins • Home",
		icon: "local_florist",
		iconBg: "neutral",
		completed: false,
	},
	{
		id: "4",
		title: "Evening Reflection",
		subtitle: "15 mins • Journaling",
		icon: "book_2",
		iconBg: "marshmallow",
		completed: false,
	},
];

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

/** Causal net: nodes = activities (labeled), edges = causal dependencies. */
export const sampleCausalNetNodes: CausalNetNode[] = [
	{ id: "work", activityLabel: "Work", x: 60, y: 100 },
	{ id: "break", activityLabel: "Break", x: 160, y: 50 },
	{ id: "focus", activityLabel: "Focus", x: 160, y: 150 },
	{ id: "done", activityLabel: "Done", x: 260, y: 100 },
];

export const sampleCausalNetEdges: CausalNetEdge[] = [
	{ from: "work", to: "break" },
	{ from: "work", to: "focus" },
	{ from: "break", to: "done" },
	{ from: "focus", to: "done" },
];

/** Category options for the heatmap (select which activity/category to show). */
export const sampleHeatmapCategories: CategoryHeatmapOption[] = [
	{ id: "work", label: "Work" },
	{ id: "study", label: "Study" },
	{ id: "exercise", label: "Exercise" },
	{ id: "leisure", label: "Leisure" },
];

/** Per-category likelihood: 7 days × 12 time slots, 0–1 = likelihood of doing that category. */
export const sampleHeatmapByCategory: HeatmapDataByCategory = {
	work: [
		[0.1, 0.3, 0.8, 0.95, 0.9, 0.85, 0.7, 0.5, 0.3, 0.2, 0.1, 0],
		[0.1, 0.35, 0.85, 0.9, 0.85, 0.75, 0.6, 0.4, 0.25, 0.15, 0.1, 0],
		[0.05, 0.25, 0.75, 0.95, 0.9, 0.8, 0.65, 0.5, 0.3, 0.2, 0.1, 0],
		[0.1, 0.3, 0.8, 0.9, 0.85, 0.7, 0.55, 0.4, 0.3, 0.2, 0.1, 0],
		[0.15, 0.35, 0.8, 0.85, 0.75, 0.6, 0.5, 0.35, 0.25, 0.15, 0.1, 0],
		[0.05, 0.1, 0.2, 0.25, 0.2, 0.15, 0.1, 0.1, 0.05, 0.05, 0, 0],
		[0, 0.05, 0.1, 0.1, 0.05, 0.05, 0, 0, 0, 0, 0, 0],
	],
	study: [
		[0.2, 0.4, 0.5, 0.6, 0.7, 0.75, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1],
		[0.15, 0.35, 0.6, 0.7, 0.75, 0.7, 0.65, 0.5, 0.35, 0.25, 0.15, 0.1],
		[0.1, 0.3, 0.55, 0.75, 0.8, 0.75, 0.65, 0.5, 0.35, 0.2, 0.1, 0.05],
		[0.15, 0.35, 0.6, 0.7, 0.75, 0.7, 0.6, 0.45, 0.3, 0.2, 0.1, 0.05],
		[0.2, 0.4, 0.65, 0.7, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15, 0.1, 0.05],
		[0.3, 0.5, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.2, 0.15, 0.1],
		[0.25, 0.4, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.15, 0.1, 0.05],
	],
	exercise: [
		[0.1, 0.2, 0.3, 0.25, 0.2, 0.15, 0.2, 0.35, 0.5, 0.4, 0.2, 0.1],
		[0.05, 0.15, 0.25, 0.2, 0.2, 0.2, 0.25, 0.4, 0.5, 0.35, 0.2, 0.1],
		[0.1, 0.2, 0.3, 0.25, 0.2, 0.2, 0.25, 0.35, 0.45, 0.35, 0.2, 0.1],
		[0.05, 0.15, 0.25, 0.3, 0.25, 0.2, 0.25, 0.4, 0.5, 0.4, 0.2, 0.1],
		[0.1, 0.2, 0.35, 0.4, 0.35, 0.3, 0.35, 0.45, 0.5, 0.35, 0.2, 0.1],
		[0.2, 0.4, 0.5, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15],
		[0.3, 0.5, 0.6, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.2, 0.15],
	],
	leisure: [
		[0.05, 0.1, 0.15, 0.2, 0.2, 0.25, 0.35, 0.5, 0.6, 0.65, 0.6, 0.5],
		[0.05, 0.1, 0.2, 0.25, 0.25, 0.3, 0.4, 0.5, 0.6, 0.6, 0.55, 0.45],
		[0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.45, 0.55, 0.6, 0.55, 0.45],
		[0.05, 0.1, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.6, 0.55, 0.5],
		[0.1, 0.15, 0.25, 0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.6, 0.55, 0.5],
		[0.2, 0.35, 0.5, 0.55, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.45, 0.4],
		[0.25, 0.4, 0.55, 0.6, 0.6, 0.6, 0.55, 0.5, 0.5, 0.45, 0.4, 0.35],
	],
};

/** @deprecated Use sampleHeatmapByCategory + sampleHeatmapCategories for per-category heatmap. */
export const sampleHeatmapData: number[][] = sampleHeatmapByCategory.work;
