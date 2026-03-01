import { describe, expect, it } from "vitest";
import {
	toActivityEntity,
	toActivityHistoryEntity,
	toConstraintEntity,
	toScheduledEventEntity,
	toUserBehaviorEntity,
	toUserEntity,
} from "../../src/data/mappers/model_to_dto";
import {
	ActivitySource,
	ConstraintType,
	EventStatus,
	Replaceability,
	TimeScope,
	UserBehaviorMetric,
} from "../../src/types/domain";

describe("model_to_dto", () => {
	it("maps activity model to ActivityEntity", () => {
		const createdAt = new Date("2026-02-27T10:00:00.000Z");
		const model = {
			id: "a1",
			categoryId: "Work",
			name: "Deep Work",
			priority: 5,
			defaultDuration: 90,
			isReplaceable: true,
			color: "#123456",
			createdAt,
		};

		const dto = toActivityEntity(model as never);
		expect(dto).toEqual({
			id: "a1",
			categoryId: "Work",
			name: "Deep Work",
			priority: 5,
			defaultDuration: 90,
			isReplaceable: true,
			color: "#123456",
			createdAt: createdAt.toISOString(),
		});
	});

	it("maps scheduled event model to ScheduledEventEntity", () => {
		const start = new Date("2026-02-27T11:00:00.000Z");
		const end = new Date("2026-02-27T12:00:00.000Z");
		const createdAt = new Date("2026-02-27T09:00:00.000Z");
		const updatedAt = new Date("2026-02-27T09:30:00.000Z");
		const model = {
			id: "e1",
			activityId: "a1",
			categoryId: "Work",
			title: "Standup",
			startTime: start,
			endTime: end,
			duration: 60,
			status: EventStatus.CONFIRMED,
			replaceabilityStatus: Replaceability.SOFT,
			priority: 3,
			isRecurring: false,
			recurringTemplateId: null,
			source: ActivitySource.USER_CREATED,
			isLocked: false,
			createdAt,
			updatedAt,
		};

		const dto = toScheduledEventEntity(model as never);
		expect(dto).toEqual({
			id: "e1",
			activityId: "a1",
			categoryId: "Work",
			title: "Standup",
			startTime: start.toISOString(),
			endTime: end.toISOString(),
			duration: 60,
			status: EventStatus.CONFIRMED,
			replaceabilityStatus: Replaceability.SOFT,
			priority: 3,
			isRecurring: false,
			recurringTemplateId: undefined,
			source: ActivitySource.USER_CREATED,
			isLocked: false,
			createdAt: createdAt.toISOString(),
			updatedAt: updatedAt.toISOString(),
		});
	});

	it("maps history, constraint, user behavior, and user models", () => {
		const now = new Date("2026-02-27T15:00:00.000Z");

		const history = toActivityHistoryEntity({
			id: "h1",
			activityId: "a1",
			predictedStartTime: now,
			predictedDuration: 30,
			localDayBucket: "2026-02-27",
			localWeekBucket: "2026-W09",
			localMonthBucket: "2026-02",
			bucketTimezone: "America/New_York",
			actualStartTime: now,
			actualDuration: 35,
			wasCompleted: true,
			wasSkipped: false,
			wasReplaced: false,
			notes: "finished early",
			createdAt: now,
		} as never);
		expect(history.localDayBucket).toBe("2026-02-27");
		expect(history.actualDuration).toBe(35);

		const constraint = toConstraintEntity({
			id: "c1",
			type: ConstraintType.USER_FREQUENCY_GOAL,
			activityId: "a1",
			categoryId: null,
			value: { scope: TimeScope.SAME_DAY, minCount: 1 },
			isActive: true,
			createdAt: now,
		} as never);
		expect(constraint.categoryId).toBeUndefined();
		expect(constraint.value).toEqual({
			scope: TimeScope.SAME_DAY,
			minCount: 1,
		});

		const behavior = toUserBehaviorEntity({
			id: "b1",
			activityId: "a1",
			categoryId: "__activity__",
			metric: UserBehaviorMetric.OBSERVED_FREQUENCY,
			keyParam: "DAILY",
			value: 1.2,
			sampleSize: 12,
			lastUpdated: now,
		} as never);
		expect(behavior.metric).toBe(UserBehaviorMetric.OBSERVED_FREQUENCY);

		const user = toUserEntity({
			id: "u1",
			username: "xing",
			email: "x@example.com",
			name: "Xing",
			timezone: "UTC",
			createdAt: now,
			notificationSettings: { notificationsEnabled: true },
		} as never);
		expect(user.username).toBe("xing");
		expect(user.notificationSettings).toEqual({ notificationsEnabled: true });
	});
});
