import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";

export default class MarkovTransitionCount extends Model {
	static table = "markov_transition_counts";

	@text("from_activity_id") fromActivityId!: string;
	@text("to_activity_id") toActivityId!: string;
	@field("count") count!: number;
	@date("last_observed_at") lastObservedAt!: Date;
}
