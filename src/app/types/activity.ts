/**
 * Types for the home screen "intentions" list (activity items).
 * Aligns with domain Activity; use for list rows and focus stats.
 */

export type ActivityItemIconBg = "marshmallow" | "primary" | "neutral";

export type ActivityItem = {
	id: string;
	title: string;
	subtitle: string;
	icon: string;
	iconBg: ActivityItemIconBg;
	completed: boolean;
};
