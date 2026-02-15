import { Model } from "@nozbe/watermelondb";
import { date, field, text } from "@nozbe/watermelondb/decorators";
import type { BehaviorPeriod, UserBehaviorMetric } from "../../types/domain";

export default class UserBehavior extends Model {
	static table = "user_behavior";

	// Optional activity this behavior relates to.
	@text("activity_id") activityId?: string;

	// Grouping for aggregate stats (e.g., "Work" category heatmap)
	@text("category_id") categoryId!: string;

	// The type of statistical profile (HEATMAP, FREQUENCY).
	@text("metric") metric!: UserBehaviorMetric;

	/**
	 * Stores the dimension key:
	 * - For HEATMAP: The TimeSlot index (e.g., "48" for 12:00 PM)
	 * - For FREQUENCY: The Period Enum (e.g., "DAILY", "MON")
	 */
	@text("key_param") keyParam!: string;

	/**
	 * Stores the statistical weight:
	 * - For HEATMAP: Probability (0.0 - 1.0)
	 * - For FREQUENCY: Observed Count (e.g., 1.5)
	 */
	@field("value") value!: number;

	@field("sample_size") sampleSize!: number;
	@date("last_updated") lastUpdated!: Date;

	/**
	 * Helper: Returns keyParam parsed as a number (for Heatmaps)
	 */
	get timeSlotIndex(): number {
		return parseInt(this.keyParam, 10);
	}

	/**
	 * Helper: Returns keyParam as BehaviorPeriod (for Frequency)
	 */
	get period(): BehaviorPeriod {
		return this.keyParam as BehaviorPeriod;
	}
}
