import { Model } from "@nozbe/watermelondb";
import { date, field, json, text } from "@nozbe/watermelondb/decorators";
import type { RecurrenceFrequency } from "../../types/domain";

const sanitizeDays = (raw: unknown) => (Array.isArray(raw) ? raw : []);

export default class RecurringActivity extends Model {
	static table = "recurring_activities";

	@text("template_id") templateId!: string;
	@text("category_id") categoryId!: string;
	@text("title") title!: string;

	@text("frequency") frequency!: RecurrenceFrequency;

	@field("interval") interval!: number;
	@json("days_of_week", sanitizeDays) daysOfWeek!: number[];
	@date("start_date") startDate!: Date;
	@text("preferred_start_time") preferredStartTime!: string;
	@field("typical_duration") typicalDuration!: number;
	@field("priority") priority!: number;
	@field("is_active") isActive!: boolean;
}
