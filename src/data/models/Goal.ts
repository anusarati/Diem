import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";
import type { GoalPeriod } from "../../types/domain";

export default class Goal extends Model {
	static table = "goals";

	@text("category_id") categoryId!: string;
	@field("target_minutes") targetMinutes!: number;

	@text("period") period!: GoalPeriod;

	@field("is_active") isActive!: boolean;
	@date("created_at") createdAt!: Date;
}
