import { Model, type Relation } from "@nozbe/watermelondb";
import { date, field, relation, text } from "@nozbe/watermelondb/decorators";
import type {
	ActivitySource,
	EventStatus,
	Replaceability,
} from "../../types/domain";
import type Activity from "./Activity";

export default class ScheduledEvent extends Model {
	static table = "scheduled_events";

	static associations = {
		activities: { type: "belongs_to", key: "activity_id" },
	} as const;

	@text("activity_id") activityId!: string;
	@relation("activities", "activity_id") activity!: Relation<Activity>;

	@text("category_id") categoryId!: string;
	@text("title") title!: string;
	@date("start_time") startTime!: Date;
	@date("end_time") endTime!: Date;
	@field("duration") duration!: number;

	@text("status") status!: EventStatus;
	@text("replaceability_status") replaceabilityStatus!: Replaceability;

	@field("priority") priority!: number;
	@field("is_recurring") isRecurring!: boolean;
	@text("recurring_template_id") recurringTemplateId?: string;

	@text("source") source!: ActivitySource;

	@field("is_locked") isLocked!: boolean;
	@date("created_at") createdAt!: Date;
	@date("updated_at") updatedAt!: Date;
}
