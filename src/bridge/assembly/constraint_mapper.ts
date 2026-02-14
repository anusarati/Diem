import { type as arkType } from "arktype";
import type Constraint from "../../data/models/Constraint";
import {
	ConstraintType,
	type CumulativeTimeValue,
	type ForbiddenZoneValue,
	type FrequencyGoalValue,
	TimeScope,
	type UserSequenceValue,
} from "../../types/domain";
import type { RustActivity, RustGlobalConstraint } from "../types";
import { allWeekdaysMask } from "./time_slots";

const HARD_BINDING_WEIGHT = 1_000_000;
const USER_FREQUENCY_PENALTY_WEIGHT = 50_000;

const forbiddenZoneValueType = arkType({
	startSlot: "number",
	endSlot: "number",
});

const cumulativeTimeValueType = arkType({
	periodSlots: "number",
	minDuration: "number",
	maxDuration: "number",
});

const userSequenceBaseType = arkType({
	predecessorId: "string",
	successorId: "string",
});

const frequencyGoalValueType = arkType({
	scope: `"${TimeScope.SAME_DAY}" | "${TimeScope.SAME_WEEK}" | "${TimeScope.SAME_MONTH}"`,
	"minCount?": "number",
	"maxCount?": "number",
});

export interface ConstraintMapperInput {
	constraints: Constraint[];
	activitiesByNumericId: Map<number, RustActivity>;
	activityIdToNumeric: Map<string, number>;
	categoryIdToNumeric: Map<string, number>;
}

export interface ConstraintMapperResult {
	globalConstraints: RustGlobalConstraint[];
	warnings: string[];
}

const asForbiddenZone = (value: unknown): ForbiddenZoneValue | null => {
	if (!forbiddenZoneValueType.allows(value)) {
		return null;
	}
	const typed = value as ForbiddenZoneValue;
	if (
		!Number.isFinite(typed.startSlot) ||
		!Number.isFinite(typed.endSlot) ||
		Math.floor(typed.startSlot) >= Math.floor(typed.endSlot)
	) {
		return null;
	}
	return {
		startSlot: Math.max(0, Math.floor(typed.startSlot)),
		endSlot: Math.max(0, Math.floor(typed.endSlot)),
	};
};

const asCumulative = (value: unknown): CumulativeTimeValue | null => {
	if (!cumulativeTimeValueType.allows(value)) {
		return null;
	}
	const typed = value as CumulativeTimeValue;
	return {
		periodSlots: Math.max(1, Math.floor(typed.periodSlots)),
		minDuration: Math.max(0, Math.floor(typed.minDuration)),
		maxDuration: Math.max(0, Math.floor(typed.maxDuration)),
	};
};

const asSequence = (value: unknown): UserSequenceValue | null => {
	if (
		!userSequenceBaseType.allows(value) ||
		!value ||
		typeof value !== "object"
	) {
		return null;
	}
	const typed = value as UserSequenceValue;
	return {
		predecessorId: typed.predecessorId,
		successorId: typed.successorId,
		minGapSlots:
			typeof typed.minGapSlots === "number" ? typed.minGapSlots : undefined,
		maxGapSlots:
			typeof typed.maxGapSlots === "number" ? typed.maxGapSlots : undefined,
	};
};

const asFrequency = (value: unknown): FrequencyGoalValue | null => {
	if (!frequencyGoalValueType.allows(value)) {
		return null;
	}
	const typed = value as FrequencyGoalValue;
	const minCount =
		typeof typed.minCount === "number"
			? Math.max(0, Math.floor(typed.minCount))
			: undefined;
	const maxCount =
		typeof typed.maxCount === "number"
			? Math.max(0, Math.floor(typed.maxCount))
			: undefined;
	if (minCount === undefined && maxCount === undefined) {
		return null;
	}
	if (minCount !== undefined && maxCount !== undefined && maxCount < minCount) {
		return null;
	}
	return {
		scope: typed.scope,
		minCount,
		maxCount,
	};
};

export class ConstraintMapper {
	map(input: ConstraintMapperInput): ConstraintMapperResult {
		const globalConstraints: RustGlobalConstraint[] = [];
		const warnings: string[] = [];

		for (const constraint of input.constraints) {
			if (!constraint.isActive) {
				continue;
			}

			switch (constraint.type) {
				case ConstraintType.GLOBAL_FORBIDDEN_ZONE: {
					const value = asForbiddenZone(constraint.value);
					if (!value) {
						warnings.push(
							`Skipping invalid forbidden-zone constraint: ${constraint.id}`,
						);
						break;
					}
					globalConstraints.push({
						ForbiddenZone: {
							start: value.startSlot,
							end: value.endSlot,
						},
					});
					break;
				}
				case ConstraintType.GLOBAL_CUMULATIVE_TIME: {
					const value = asCumulative(constraint.value);
					if (!value) {
						warnings.push(
							`Skipping invalid cumulative-time constraint: ${constraint.id}`,
						);
						break;
					}

					const categoryId = constraint.categoryId
						? (input.categoryIdToNumeric.get(constraint.categoryId) ?? null)
						: null;
					globalConstraints.push({
						CumulativeTime: {
							category_id: categoryId,
							period_slots: value.periodSlots,
							min_duration: value.minDuration,
							max_duration: value.maxDuration,
						},
					});
					break;
				}
				case ConstraintType.USER_SEQUENCE: {
					const value = asSequence(constraint.value);
					if (!value) {
						warnings.push(
							`Skipping invalid sequence constraint: ${constraint.id}`,
						);
						break;
					}

					const predecessor = input.activityIdToNumeric.get(
						value.predecessorId,
					);
					const successor = input.activityIdToNumeric.get(value.successorId);
					if (predecessor === undefined || successor === undefined) {
						warnings.push(
							`Skipping sequence constraint with unknown activities: ${constraint.id}`,
						);
						break;
					}

					const successorActivity = input.activitiesByNumericId.get(successor);
					const predecessorActivity =
						input.activitiesByNumericId.get(predecessor);
					if (!successorActivity || !predecessorActivity) {
						warnings.push(
							`Skipping sequence constraint due to missing mapped activity: ${constraint.id}`,
						);
						break;
					}

					successorActivity.input_bindings.push({
						required_sets: [[predecessor]],
						time_scope: TimeScope.SAME_DAY,
						valid_weekdays: allWeekdaysMask(),
						weight: HARD_BINDING_WEIGHT,
					});

					predecessorActivity.output_bindings.push({
						required_sets: [[successor]],
						time_scope: TimeScope.SAME_DAY,
						valid_weekdays: allWeekdaysMask(),
						weight: HARD_BINDING_WEIGHT,
					});

					if (
						value.minGapSlots !== undefined ||
						value.maxGapSlots !== undefined
					) {
						warnings.push(
							`Sequence gap constraints are not supported by Rust bindings yet: ${constraint.id}`,
						);
					}

					break;
				}
				case ConstraintType.USER_FREQUENCY_GOAL: {
					if (!constraint.activityId) {
						warnings.push(
							`Skipping frequency goal without activity_id: ${constraint.id}`,
						);
						break;
					}
					const activityNumeric = input.activityIdToNumeric.get(
						constraint.activityId,
					);
					if (activityNumeric === undefined) {
						warnings.push(
							`Skipping frequency goal for unknown activity: ${constraint.id}`,
						);
						break;
					}
					const activity = input.activitiesByNumericId.get(activityNumeric);
					if (!activity) {
						warnings.push(
							`Skipping frequency goal due to missing mapped activity: ${constraint.id}`,
						);
						break;
					}
					const value = asFrequency(constraint.value);
					if (!value) {
						warnings.push(`Skipping invalid frequency goal: ${constraint.id}`);
						break;
					}

					activity.user_frequency_constraints.push({
						scope: value.scope,
						min_count: value.minCount ?? null,
						max_count: value.maxCount ?? null,
						penalty_weight: USER_FREQUENCY_PENALTY_WEIGHT,
					});
					break;
				}
				default:
					warnings.push(
						`Unsupported constraint type ignored: ${constraint.type}`,
					);
			}
		}

		return {
			globalConstraints,
			warnings,
		};
	}
}
