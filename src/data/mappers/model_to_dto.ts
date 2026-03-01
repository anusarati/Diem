import type {
	ActivityEntity,
	ActivityHistoryEntity,
	ConstraintEntity,
	ScheduledEventEntity,
	UserBehaviorEntity,
	UserEntity,
} from "../../types/domain";
import type Activity from "../models/Activity";
import type ActivityHistory from "../models/ActivityHistory";
import type Constraint from "../models/Constraint";
import type ScheduledEvent from "../models/ScheduledEvent";
import type User from "../models/User";
import type UserBehavior from "../models/UserBehavior";

const toIso = (value: Date): string => value.toISOString();

const nullableToOptionalString = (
	value: string | null | undefined,
): string | undefined => {
	if (typeof value !== "string" || value.length === 0) {
		return undefined;
	}
	return value;
};

const nullableToOptionalNumber = (
	value: number | null | undefined,
): number | undefined => {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return undefined;
	}
	return value;
};

export function toActivityEntity(model: Activity): ActivityEntity {
	return {
		id: model.id,
		categoryId: model.categoryId,
		name: model.name,
		priority: model.priority,
		defaultDuration: model.defaultDuration,
		isReplaceable: model.isReplaceable,
		color: model.color,
		createdAt: toIso(model.createdAt),
	};
}

export function toScheduledEventEntity(
	model: ScheduledEvent,
): ScheduledEventEntity {
	return {
		id: model.id,
		activityId: model.activityId,
		categoryId: model.categoryId,
		title: model.title,
		startTime: toIso(model.startTime),
		endTime: toIso(model.endTime),
		duration: model.duration,
		status: model.status,
		replaceabilityStatus: model.replaceabilityStatus,
		priority: model.priority,
		isRecurring: model.isRecurring,
		recurringTemplateId: nullableToOptionalString(model.recurringTemplateId),
		source: model.source,
		isLocked: model.isLocked,
		createdAt: toIso(model.createdAt),
		updatedAt: toIso(model.updatedAt),
	};
}

export function toActivityHistoryEntity(
	model: ActivityHistory,
): ActivityHistoryEntity {
	return {
		id: model.id,
		activityId: model.activityId,
		predictedStartTime: toIso(model.predictedStartTime),
		predictedDuration: model.predictedDuration,
		localDayBucket: nullableToOptionalString(model.localDayBucket),
		localWeekBucket: nullableToOptionalString(model.localWeekBucket),
		localMonthBucket: nullableToOptionalString(model.localMonthBucket),
		bucketTimezone: nullableToOptionalString(model.bucketTimezone),
		actualStartTime: model.actualStartTime
			? toIso(model.actualStartTime)
			: undefined,
		actualDuration: nullableToOptionalNumber(model.actualDuration),
		wasCompleted: model.wasCompleted,
		wasSkipped: model.wasSkipped,
		wasReplaced: model.wasReplaced,
		notes: nullableToOptionalString(model.notes),
		createdAt: toIso(model.createdAt),
	};
}

export function toConstraintEntity(model: Constraint): ConstraintEntity {
	return {
		id: model.id,
		type: model.type,
		activityId: nullableToOptionalString(model.activityId),
		categoryId: nullableToOptionalString(model.categoryId),
		value: model.value,
		isActive: model.isActive,
		createdAt: toIso(model.createdAt),
	};
}

export function toUserBehaviorEntity(model: UserBehavior): UserBehaviorEntity {
	return {
		id: model.id,
		activityId: nullableToOptionalString(model.activityId),
		categoryId: model.categoryId,
		metric: model.metric,
		keyParam: model.keyParam,
		value: model.value,
		sampleSize: model.sampleSize,
		lastUpdated: toIso(model.lastUpdated),
	};
}

export function toUserEntity(model: User): UserEntity {
	return {
		id: model.id,
		username: nullableToOptionalString(model.username),
		email: model.email,
		name: model.name,
		timezone: model.timezone,
		createdAt: toIso(model.createdAt),
		notificationSettings: model.notificationSettings,
	};
}
