import { Model, type Query } from "@nozbe/watermelondb";
import { children, date, field, text } from "@nozbe/watermelondb/decorators";
import type ActivityHistory from "./ActivityHistory";
import type ScheduledEvent from "./ScheduledEvent";

export default class Activity extends Model {
	static table = "activities";

	static associations = {
		scheduled_events: { type: "has_many", foreignKey: "activity_id" },
		activity_history: { type: "has_many", foreignKey: "activity_id" },
	} as const;

	@text("category_id") categoryId!: string;
	@text("name") name!: string;
	@field("priority") priority!: number;
	@field("default_duration") defaultDuration!: number;
	@field("is_replaceable") isReplaceable!: boolean;
	@text("color") color!: string;
	@date("created_at") createdAt!: Date;

	@children("scheduled_events") scheduledEvents!: Query<ScheduledEvent>;
	@children("activity_history") history!: Query<ActivityHistory>;
}
