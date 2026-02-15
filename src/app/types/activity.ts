/**
 * Types for the home screen "intentions" list (activity items).
 * Aligns with domain Activity; use for list rows and focus stats.
 */

export type ActivityItemIconBg = "marshmallow" | "primary" | "neutral";

/** Category for goal-time breakdown; must match ActivityCategory in index. */
export type ActivityItemCategory =
	| "Work"
	| "Personal"
	| "Fitness"
	| "Study"
	| "Other";

export type ActivityItem = {
	id: string;
	title: string;
	subtitle: string;
	icon: string;
	iconBg: ActivityItemIconBg;
	completed: boolean;
	/** Time (minutes) user logged when marking this task done. Fills "Done" in Analytics. */
	completedMinutes?: number;
	/** Category for goal-time breakdown in Analytics. Defaults to "Other" if missing. */
	category?: ActivityItemCategory;
};
