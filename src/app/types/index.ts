/**
 * App-level types for UI and navigation.
 * Use these for screen props and component APIs so the app stays consistent with main (e.g. Activity).
 */

export type AppRoute = "Home" | "Analysis" | "Calendar" | "Profile";

export type { ActivityItem, ActivityItemIconBg } from "./activity";
export type {
	ActivityBreakdownItem,
	GoalTimeData,
	PetriNetArc,
	PetriNetPlace,
	PetriNetTransition,
} from "./analysis";
