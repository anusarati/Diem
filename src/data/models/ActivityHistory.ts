import { Model, type Relation } from "@nozbe/watermelondb";
import { date, field, relation, text } from "@nozbe/watermelondb/decorators";
import type Activity from "./Activity";

export default class ActivityHistory extends Model {
	static table = "activity_history";

	static associations = {
		activities: { type: "belongs_to", key: "activity_id" },
	} as const;

	@text("activity_id") activityId!: string;
	@relation("activities", "activity_id") activity!: Relation<Activity>;

	@date("predicted_start_time") predictedStartTime!: Date;
	@field("predicted_duration") predictedDuration!: number;
	@date("actual_start_time") actualStartTime?: Date;
	@field("actual_duration") actualDuration?: number;
	@text("local_day_bucket") localDayBucket?: string;
	@text("local_week_bucket") localWeekBucket?: string;
	@text("local_month_bucket") localMonthBucket?: string;
	@text("bucket_timezone") bucketTimezone?: string;
	@field("was_completed") wasCompleted!: boolean;
	@field("was_skipped") wasSkipped!: boolean;
	@field("was_replaced") wasReplaced!: boolean;
	@text("notes") notes?: string;
	@date("created_at") createdAt!: Date;
}
