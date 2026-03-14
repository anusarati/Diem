export type NotificationType =
	| "UPCOMING_ACTIVITY"
	| "GOAL_REMINDER"
	| "RETROSPECTIVE_REVIEW"
	| "MISSED_ACTIVITY"
	| "PREDICTION_UPDATE";

export interface NotificationPayload {
	type: NotificationType;
	activityId?: string;
	scheduledEventId?: string;
	timestamp: number;
}
