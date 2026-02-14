import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";
import type { FrequencyEmaScope } from "../../types/domain";

export default class FrequencyEmaState extends Model {
	static table = "frequency_ema_state";

	@text("activity_id") activityId!: string;
	@text("scope") scope!: FrequencyEmaScope;
	@field("ema_value") emaValue!: number;
	@field("sample_size") sampleSize!: number;
	@text("open_bucket_key") openBucketKey?: string;
	@field("open_bucket_count") openBucketCount!: number;
	@text("last_closed_bucket_key") lastClosedBucketKey?: string;
	@field("dirty") dirty!: boolean;
	@date("updated_at") updatedAt!: Date;
}
