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
}

export interface UserSequenceValue {
	predecessorId: string;
	successorId: string;
	minGapSlots?: number;
	maxGapSlots?: number;
}

export interface FrequencyGoalValue {
	scope: TimeScope;
	targetCount: number;
}

// --- Learning & Mining Types ---

/**
 * Defines what kind of statistical profile is stored in UserBehavior.
 */
export enum UserBehaviorMetric {
	// Probability of Activity Y happening given Activity X happened just before.
	// key_param: Predecessor Activity ID
	// value: Probability (0.0 - 1.0)
	HEURISTIC_DEPENDENCY = "HEURISTIC_DEPENDENCY",

	// Probability of Activity occurring at a specific time of day.
	// key_param: TimeSlot index
	// value: Probability Density (0.0 - 1.0)
	HEATMAP_PROBABILITY = "HEATMAP_PROBABILITY",

	// Observed frequency of an activity over a specific period.
	// key_param: BehaviorPeriod (e.g., "DAILY", "MON", "WEEKLY")
	// value: Average Count (e.g., 1.5 times per day)
	OBSERVED_FREQUENCY = "OBSERVED_FREQUENCY",
}

/**
 * Keys for OBSERVED_FREQUENCY metric in UserBehavior
 */
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
