export enum EventStatus {
	PREDICTED = "PREDICTED",
	CONFIRMED = "CONFIRMED",
	COMPLETED = "COMPLETED",
	SKIPPED = "SKIPPED",
	REPLACED = "REPLACED",
}

export enum Replaceability {
	HARD = "HARD",
	SOFT = "SOFT",
}

export enum RecurrenceFrequency {
	DAILY = "DAILY",
	WEEKLY = "WEEKLY",
	MONTHLY = "MONTHLY",
}

export enum ActivitySource {
	USER_CREATED = "USER_CREATED",
	SYSTEM_PREDICTED = "SYSTEM_PREDICTED",
	EXTERNAL_IMPORT = "EXTERNAL_IMPORT",
}

export interface ActivityEntity {
	id: string;
	categoryId: string;
	name: string;
	priority: number;
	defaultDuration: number;
	isReplaceable: boolean;
	color: string;
	createdAt: string;
}

export interface ScheduledEventEntity {
	id: string;
	activityId: string;
	categoryId: string;
	title: string;
	startTime: string;
	endTime: string;
	duration: number;
	status: EventStatus;
	replaceabilityStatus: Replaceability;
	priority: number;
	isRecurring: boolean;
	recurringTemplateId?: string;
	source: ActivitySource;
	isLocked: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ActivityHistoryEntity {
	id: string;
	activityId: string;
	predictedStartTime: string;
	predictedDuration: number;
	localDayBucket?: string;
	localWeekBucket?: string;
	localMonthBucket?: string;
	bucketTimezone?: string;
	actualStartTime?: string;
	actualDuration?: number;
	wasCompleted: boolean;
	wasSkipped: boolean;
	wasReplaced: boolean;
	notes?: string;
	createdAt: string;
}

export enum GoalPeriod {
	DAILY = "daily",
	WEEKLY = "weekly",
	MONTHLY = "monthly",
}

export enum GoalStatus {
	ON_TRACK = "ON_TRACK",
	AT_RISK = "AT_RISK",
	OFF_TRACK = "OFF_TRACK",
}

// --- Optimization Engine Types (Rust Compat) ---

export enum TimeScope {
	SAME_DAY = "SameDay",
	SAME_WEEK = "SameWeek",
	SAME_MONTH = "SameMonth",
}

export enum ConstraintType {
	// Global Constraints (Applied to the whole schedule)
	GLOBAL_FORBIDDEN_ZONE = "GLOBAL_FORBIDDEN_ZONE",
	GLOBAL_CUMULATIVE_TIME = "GLOBAL_CUMULATIVE_TIME",

	// User-defined Constraints
	USER_FREQUENCY_GOAL = "USER_FREQUENCY_GOAL",
	USER_SEQUENCE = "USER_SEQUENCE",
}

// Interfaces for the JSON 'value' column in Constraints table

export interface ForbiddenZoneValue {
	startSlot: number;
	endSlot: number;
}

export interface CumulativeTimeValue {
	periodSlots: number;
	minDuration: number;
	maxDuration: number;
	deadlineEndSlot?: number;
}

export interface UserSequenceValue {
	predecessorId: string;
	successorId: string;
	minGapSlots?: number;
	maxGapSlots?: number;
}

export interface FrequencyGoalValue {
	scope: TimeScope;
	minCount?: number;
	maxCount?: number;
	deadlineEndSlot?: number;
}

export type ConstraintValue =
	| ForbiddenZoneValue
	| CumulativeTimeValue
	| UserSequenceValue
	| FrequencyGoalValue;

export interface ConstraintEntity {
	id: string;
	type: ConstraintType;
	activityId?: string;
	categoryId?: string;
	value: ConstraintValue;
	isActive: boolean;
	createdAt: string;
}

// --- Learning & Mining Types ---

export enum FrequencyEmaScope {
	DAILY = "DAILY",
	WEEKLY = "WEEKLY",
	MONTHLY = "MONTHLY",
}

export enum UserBehaviorMetric {
	// Probability of Activity occurring at a specific time of day.
	// key_param: TimeSlot index
	// value: Probability Density (0.0 - 1.0)
	HEATMAP_PROBABILITY = "HEATMAP_PROBABILITY",

	// Observed frequency of an activity over a specific period.
	// key_param: BehaviorPeriod (e.g., "DAILY", "MON", "WEEKLY")
	// value: Average Count (e.g., 1.5 times per day)
	OBSERVED_FREQUENCY = "OBSERVED_FREQUENCY",
}

export enum BehaviorPeriod {
	DAILY = "DAILY",
	WEEKLY = "WEEKLY",
	MONTHLY = "MONTHLY",
	MON = "MON",
	TUE = "TUE",
	WED = "WED",
	THU = "THU",
	FRI = "FRI",
	SAT = "SAT",
	SUN = "SUN",
}

export interface UserBehaviorEntity {
	id: string;
	activityId?: string;
	categoryId: string;
	metric: UserBehaviorMetric;
	keyParam: string;
	value: number;
	sampleSize: number;
	lastUpdated: string;
}

export interface UserEntity {
	id: string;
	username?: string;
	email: string;
	name: string;
	timezone: string;
	createdAt: string;
	notificationSettings: Record<string, unknown>;
}

// --- Canonical create/update DTOs ---

export type CreateActivityInput = Omit<ActivityEntity, "id" | "createdAt"> & {
	id?: string;
	createdAt?: string;
};

export type UpdateActivityInput = Partial<
	Omit<ActivityEntity, "id" | "createdAt">
>;

export type CreateScheduledEventInput = Omit<
	ScheduledEventEntity,
	"id" | "createdAt" | "updatedAt"
> & {
	id?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type UpdateScheduledEventInput = Partial<
	Omit<ScheduledEventEntity, "id" | "createdAt">
> & {
	createdAt?: string;
};

export type CreateActivityHistoryInput = Omit<ActivityHistoryEntity, "id"> & {
	id?: string;
};

export type UpdateActivityHistoryInput = Partial<
	Omit<ActivityHistoryEntity, "id" | "activityId">
>;

export type CreateConstraintInput = Omit<
	ConstraintEntity,
	"id" | "createdAt"
> & {
	id?: string;
	createdAt?: string;
};

export type UpdateConstraintInput = Partial<
	Omit<ConstraintEntity, "id" | "createdAt">
>;

// --- Heuristics-Net Storage Types ---

export enum HNetTimeScope {
	SAME_DAY = "SameDay",
	SAME_WEEK = "SameWeek",
	SAME_MONTH = "SameMonth",
}

export enum HNetPairType {
	SUCCESSOR_PAIR = "SUCCESSOR_PAIR",
	PREDECESSOR_PAIR = "PREDECESSOR_PAIR",
}
