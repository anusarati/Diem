import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";
import type { HNetPairType, HNetTimeScope } from "../../types/domain";

export default class HNetPairCount extends Model {
	static table = "hnet_pair_counts";

	@text("anchor_activity_id") anchorActivityId!: string;
	@text("first_activity_id") firstActivityId!: string;
	@text("second_activity_id") secondActivityId!: string;
	@text("pair_type") pairType!: HNetPairType;
	@text("time_scope") timeScope!: HNetTimeScope;
	@field("weekday_mask") weekdayMask!: number;
	@field("co_occurrence_count") coOccurrenceCount!: number;
	@field("anchor_sample_size") anchorSampleSize!: number;
	@date("last_observed_at") lastObservedAt!: Date;
}
