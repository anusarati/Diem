import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";
import type { HNetTimeScope } from "../../types/domain";

export default class HNetArcCount extends Model {
	static table = "hnet_arc_counts";

	@text("predecessor_activity_id") predecessorActivityId!: string;
	@text("successor_activity_id") successorActivityId!: string;
	@text("time_scope") timeScope!: HNetTimeScope;
	@field("weekday_mask") weekdayMask!: number;
	@field("count") count!: number;
	@date("last_observed_at") lastObservedAt!: Date;
}
