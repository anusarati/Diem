import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";
import type { GoalStatus } from "../../types/domain";

export default class GoalProgress extends Model {
	static table = "goal_progress";

	@text("goal_id") goalId!: string;
	@date("period_start") periodStart!: Date;
	@date("period_end") periodEnd!: Date;
	@field("current_minutes") currentMinutes!: number;
	@field("projected_minutes") projectedMinutes!: number;

	@text("status") status!: GoalStatus;

	@date("calculated_at") calculatedAt!: Date;
}
