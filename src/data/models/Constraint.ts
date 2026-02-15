import { Model } from "@nozbe/watermelondb";
import { date, field, json, text } from "@nozbe/watermelondb/decorators";
import type {
	ConstraintType,
	CumulativeTimeValue,
	ForbiddenZoneValue,
	FrequencyGoalValue,
	UserSequenceValue,
} from "../../types/domain";

const sanitizeJson = (raw: unknown) =>
	typeof raw === "object" && raw !== null ? raw : {};

export type ConstraintValue =
	| ForbiddenZoneValue
	| CumulativeTimeValue
	| UserSequenceValue
	| FrequencyGoalValue;

export default class Constraint extends Model {
	static table = "constraints";

	@text("type") type!: ConstraintType;

	// For Activity-level constraints (Sequence, Frequency)
	@text("activity_id") activityId?: string;

	// For Global constraints that apply to a category (Cumulative Time)
	@text("category_id") categoryId?: string;

	@json("value", sanitizeJson) value!: ConstraintValue;

	@field("is_active") isActive!: boolean;
	@date("created_at") createdAt!: Date;
}
