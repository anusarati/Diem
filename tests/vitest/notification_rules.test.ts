import { describe, expect, it } from "vitest";
import { NotificationRules } from "../../src/services/notification/notification_rules";
import {
	ActivitySource,
	EventStatus,
	Replaceability,
} from "../../src/types/domain";

describe("NotificationRules", () => {
	it("should suggest an upcoming reminder 10 minutes before an event", () => {
		const tenMinutesFromNow = new Date(Date.now() + 15 * 60 * 1000); // 15 mins away
		const event = {
			id: "1",
			activityId: "a1",
			categoryId: "c1",
			title: "Critical Meeting",
			startTime: tenMinutesFromNow.toISOString(),
			endTime: new Date(
				tenMinutesFromNow.getTime() + 30 * 60 * 1000,
			).toISOString(),
			duration: 30,
			status: EventStatus.CONFIRMED,
			replaceabilityStatus: Replaceability.SOFT,
			priority: 3,
			isRecurring: false,
			source: ActivitySource.USER_CREATED,
			isLocked: true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			date: tenMinutesFromNow.toISOString().split("T")[0],
		};

		const result = NotificationRules.getUpcomingActivityReminder(event);
		expect(result.shouldNotify).toBe(true);
		expect(result.triggerDate.getTime()).toBeCloseTo(
			tenMinutesFromNow.getTime() - 10 * 60 * 1000,
			-2,
		);
	});

	it("should not notify if the event is already in the past", () => {
		const pastDate = new Date(Date.now() - 5 * 60 * 1000);
		const event = {
			id: "2",
			activityId: "a2",
			categoryId: "c2",
			title: "Past Meeting",
			startTime: pastDate.toISOString(),
			endTime: new Date(pastDate.getTime() + 30 * 60 * 1000).toISOString(),
			duration: 30,
			status: EventStatus.CONFIRMED,
			replaceabilityStatus: Replaceability.HARD,
			priority: 1,
			isRecurring: false,
			source: ActivitySource.USER_CREATED,
			isLocked: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			date: pastDate.toISOString().split("T")[0],
		};

		const result = NotificationRules.getUpcomingActivityReminder(event);
		expect(result.shouldNotify).toBe(false);
	});

	it("should schedule a daily retrospective for 9 PM today or tomorrow", () => {
		const result = NotificationRules.getDailyRetrospectiveReminder();
		expect(result.shouldNotify).toBe(true);
		expect(result.triggerDate.getHours()).toBe(21);
		expect(result.triggerDate.getMinutes()).toBe(0);
		expect(result.triggerDate.getTime()).toBeGreaterThan(Date.now());
	});
});
