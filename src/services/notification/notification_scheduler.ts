import type { ScheduledEventEntity } from "../../types/domain";
import { NotificationRules } from "./notification_rules";
import {
	cancelAllNotifications,
	scheduleNotification,
} from "./notification_service";

/**
 * High-level scheduler that orchestrates notification scheduling based on events.
 */
export async function scheduleActivityNotifications(
	events: ScheduledEventEntity[],
) {
	// For local-first performance, we clear and re-schedule to avoid duplicates
	// or stale notifications when the schedule changes.
	await cancelAllNotifications();

	for (const event of events) {
		const reminder = NotificationRules.getUpcomingActivityReminder(event);

		if (reminder.shouldNotify) {
			console.log(
				`[Notification] Scheduling reminder for ${event.title} at ${reminder.triggerDate.toLocaleTimeString()}`,
			);
			await scheduleNotification(
				reminder.title,
				reminder.body,
				reminder.triggerDate,
				{
					type: "UPCOMING_ACTIVITY",
					activityId: event.activityId,
					scheduledEventId: event.id,
				},
			);
		} else {
			console.log(
				`[Notification] Skipping reminder for ${event.title} (trigger date ${reminder.triggerDate.toLocaleTimeString()} is in the past)`,
			);
		}

		const inquiry = NotificationRules.getActivityStartInquiry(event);
		if (inquiry.shouldNotify) {
			console.log(
				`[Notification] Scheduling inquiry for ${event.title} at ${inquiry.triggerDate.toLocaleTimeString()}`,
			);
			await scheduleNotification(
				inquiry.title,
				inquiry.body,
				inquiry.triggerDate,
				{
					type: "ACTIVITY_START_INQUIRY",
					activityId: event.activityId,
					scheduledEventId: event.id,
					category: inquiry.category,
				},
			);
		} else {
			console.log(
				`[Notification] Skipping inquiry for ${event.title} (trigger date ${inquiry.triggerDate.toLocaleTimeString()} is in the past)`,
			);
		}
	}

	// Also schedule the daily retrospective
	const retro = NotificationRules.getDailyRetrospectiveReminder();
	await scheduleNotification(retro.title, retro.body, retro.triggerDate, {
		type: "RETROSPECTIVE_REVIEW",
	});
}

/**
 * Notifies the user that the schedule has been updated.
 */
export async function notifyPredictionUpdate() {
	const notice = NotificationRules.getPredictionUpdateNotice();
	await scheduleNotification(notice.title, notice.body, notice.triggerDate, {
		type: "PREDICTION_UPDATE",
	});
}
