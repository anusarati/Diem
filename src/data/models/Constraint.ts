import { Model } from "@nozbe/watermelondb";
import { date, field, json, text } from "@nozbe/watermelondb/decorators";
import type { ConstraintType } from "../../types/domain";

const sanitizeJson = (raw: unknown) =>
	typeof raw === "object" && raw !== null ? raw : {};

export default class Constraint extends Model {
	static table = "constraints";

	@text("type") type!: ConstraintType;

	@text("activity_id") activityId?: string;
	@text("category_id") categoryId?: string;
	@json("value", sanitizeJson) value!: Record<string, unknown>;
	@field("is_active") isActive!: boolean;
	@date("created_at") createdAt!: Date;
}
