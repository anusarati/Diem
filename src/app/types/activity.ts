import type { ActivityEntity } from "../../types/domain";

/**
 * Home-row activity view based on the backend activity shape.
 * Completion fields are UI/history-derived and not stored on Activity itself.
 */
export type ActivityItem = ActivityEntity & {
	completed: boolean;
	completedDuration?: number;
	/** When this instance is scheduled (for display in week view). */
	predictedStartTime?: string;
};
