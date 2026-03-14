import {
	EventStatus,
	Replaceability,
	type ScheduledEventEntity,
} from "../../types/domain";

export interface NotificationRuleResult {
	shouldNotify: boolean;
	triggerDate: Date;
	title: string;
	body: string;
	category?: string;
}

/**
 * Rules engine to decide when and what to notify.
 */
export const NotificationRules = {
	/**
	 * Rule 1: Upcoming Activity Reminder
	 * Trigger: 10 minutes before start time
	 * Purpose: Information only
	 */
	getUpcomingActivityReminder(
		event: ScheduledEventEntity,
	): NotificationRuleResult {
		const startTime = new Date(event.startTime).getTime();
		const triggerTime = startTime - 10 * 60 * 1000;
		const now = Date.now();

		const shouldNotify =
			(event.status === EventStatus.CONFIRMED ||
				event.status === EventStatus.PREDICTED) &&
			event.replaceabilityStatus !== Replaceability.HARD &&
			triggerTime > now;

		return {
			shouldNotify,
			triggerDate: new Date(triggerTime),
			title: "Activity Starting Soon",
			body: `${event.title} starts in 10 minutes`,
		};
	},

	/**
	 * Rule 2: Activity Start Inquiry
	 * Trigger: Exactly at start time
	 * Purpose: Interactive (Started / Delay / Skip)
	 */
	getActivityStartInquiry(event: ScheduledEventEntity): NotificationRuleResult {
		const triggerTime = new Date(event.startTime).getTime();
		const now = Date.now();

		const shouldNotify =
			(event.status === EventStatus.CONFIRMED ||
				event.status === EventStatus.PREDICTED) &&
			event.replaceabilityStatus !== Replaceability.HARD &&
			triggerTime > now;

		return {
			shouldNotify,
			triggerDate: new Date(triggerTime),
			title: "Activity Starting Now",
			body: `Are you starting "${event.title}"?`,
			category: "ACTIVITY_INQUIRY",
		};
	},

	/**
	 * Rule 2: End-of-Day Retrospective
	 * Trigger: 9 PM local time
	 */
	getDailyRetrospectiveReminder(): NotificationRuleResult {
		const now = new Date();
		const triggerDate = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			21,
			0,
			0,
		);

		// If 9 PM has passed today, schedule for tomorrow
		if (triggerDate.getTime() <= now.getTime()) {
			triggerDate.setDate(triggerDate.getDate() + 1);
		}

		return {
			shouldNotify: true,
			triggerDate,
			title: "End-of-Day Review",
			body: "What actually happened today? Time for your daily retrospective.",
		};
	},

	/**
	 * Rule 3: Prediction Update
	 * Trigger: Immediately (when solver re-runs)
	 */
	getPredictionUpdateNotice(): NotificationRuleResult {
		return {
			shouldNotify: true,
			triggerDate: new Date(Date.now() + 1000), // 1 second from now
			title: "Schedule Updated",
			body: "Your schedule was updated based on new activity patterns.",
		};
	},
};
