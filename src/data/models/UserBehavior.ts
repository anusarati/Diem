import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";

export default class UserBehavior extends Model {
	static table = "user_behavior";

	@text("activity_id") activityId?: string;
	@text("category_id") categoryId!: string;
	@text("metric") metric!: string;
	@text("key_param") keyParam!: string;
	@field("value") value!: number;
	@field("sample_size") sampleSize!: number;
	@date("last_updated") lastUpdated!: Date;
}
