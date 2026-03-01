/**
 * App-level types for UI and navigation.
 * Use these for screen props and component APIs so the app stays consistent with main (e.g. Activity).
 */
import type { ScheduledEventEntity } from "../../types/domain";

export type AppRoute =
	| "Home"
	| "Analysis"
	| "Calendar"
	| "Profile"
	| "Settings"
	| "AddTask"
	| "ManageTasks";

/** User preferences persisted to storage/DB. */
export type UserSettings = {
	notificationsEnabled: boolean;
};

export type ActivityCategory = string;
export type ScheduledActivity = ScheduledEventEntity;

export type { ActivityItem } from "./activity";
export type {
	ActivityBreakdownItem,
	CategoryHeatmapOption,
	CausalNetEdge,
	CausalNetNode,
	GoalTimeData,
	HeatmapDataByCategory,
} from "./analysis";
