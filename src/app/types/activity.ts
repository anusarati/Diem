import type { ActivityEntity } from "../../types/domain";

/**
 * Home-row activity view based on the backend activity shape.
 * Completion fields are UI/history-derived and not stored on Activity itself.
 */
export interface RecurrencePattern {
	frequency: "DAILY" | "WEEKLY" | "MONTHLY";
	interval: number;
	daysOfWeek?: number[];
	dayOfMonth?: number;
}

export type ActivityItem = ActivityEntity & {
	completed: boolean;
	completedDuration?: number;
	/** When this instance is scheduled (for display in week view). */
	predictedStartTime?: string;
	isRecurring?: boolean;
	recurrencePattern?: RecurrencePattern;
};
