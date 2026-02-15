/**
 * App-level types for UI and navigation.
 * Use these for screen props and component APIs so the app stays consistent with main (e.g. Activity).
 */

export type AppRoute =
	| "Home"
	| "Analysis"
	| "Calendar"
	| "Profile"
	| "Settings"
	| "AddTask";

/** User preferences persisted to storage/DB. */
export type UserSettings = {
	notificationsEnabled: boolean;
};

/** Priority for scheduled activities (calendar + recommendations). */
export type ActivityPriority = "Low" | "Medium" | "High";

/** Category for calendar block color and recommendations. */
export type ActivityCategory =
	| "Work"
	| "Personal"
	| "Fitness"
	| "Study"
	| "Other";

/** Time-blocked activity for the schedule/calendar. */
export type ScheduledActivity = {
	id: string;
	title: string;
	/** Date as YYYY-MM-DD. */
	date: string;
	/** Start time 24h, e.g. "10:00". */
	startTime: string;
	/** Duration in minutes. */
	durationMinutes: number;
	priority: ActivityPriority;
	/** If true, recommendation system can suggest moving it. */
	flexible: boolean;
	/** Maps to calendar block color. */
	category: ActivityCategory;
	/** Due date YYYY-MM-DD. */
	deadline: string;
	/** Todo list: user can check off when done. */
	completed: boolean;
	/** Time (minutes) actually spent when completed. Used for "Done" in Analytics; falls back to durationMinutes. */
	actualMinutesSpent?: number;
};

export type { ActivityItem, ActivityItemIconBg } from "./activity";
export type {
	ActivityBreakdownItem,
	CategoryHeatmapOption,
	CausalNetEdge,
	CausalNetNode,
	GoalTimeData,
	HeatmapDataByCategory,
} from "./analysis";
