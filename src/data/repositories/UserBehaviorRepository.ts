import { type Database, Q } from "@nozbe/watermelondb";
import { type BehaviorPeriod, UserBehaviorMetric } from "../../types/domain";
import type UserBehavior from "../models/UserBehavior";

export interface ObservedFrequencyUpsertInput {
	activityId: string;
	period: BehaviorPeriod;
	value: number;
	sampleSize: number;
	observedAt: Date;
}

const ACTIVITY_LEVEL_CATEGORY_ID = "__activity__";

const normalizeFinite = (value: number): number =>
	Number.isFinite(value) ? value : 0;

export class UserBehaviorRepository {
	constructor(private readonly database: Database) {}

	private get collection() {
		return this.database.get<UserBehavior>("user_behavior");
	}

	async listAll(): Promise<UserBehavior[]> {
		return this.collection.query().fetch();
	}

	observeAll() {
		return this.collection.query().observe();
	}

	async listByMetric(metric: UserBehaviorMetric): Promise<UserBehavior[]> {
		return this.collection.query(Q.where("metric", metric)).fetch();
	}

	observeByMetric(metric: UserBehaviorMetric) {
		return this.collection.query(Q.where("metric", metric)).observe();
	}

	async listForActivity(activityId: string): Promise<UserBehavior[]> {
		return this.collection.query(Q.where("activity_id", activityId)).fetch();
	}

	observeForActivity(activityId: string) {
		return this.collection.query(Q.where("activity_id", activityId)).observe();
	}

	async listObservedFrequencyForActivity(
		activityId: string,
	): Promise<UserBehavior[]> {
		return this.collection
			.query(
				Q.where("metric", UserBehaviorMetric.OBSERVED_FREQUENCY),
				Q.where("activity_id", activityId),
				Q.where("category_id", ACTIVITY_LEVEL_CATEGORY_ID),
			)
			.fetch();
	}

	observeObservedFrequencyForActivity(activityId: string) {
		return this.collection
			.query(
				Q.where("metric", UserBehaviorMetric.OBSERVED_FREQUENCY),
				Q.where("activity_id", activityId),
				Q.where("category_id", ACTIVITY_LEVEL_CATEGORY_ID),
			)
			.observe();
	}

	async upsertObservedFrequency(
		input: ObservedFrequencyUpsertInput,
	): Promise<void> {
		await this.database.write(async () => {
			const existing = await this.collection
				.query(
					Q.where("metric", UserBehaviorMetric.OBSERVED_FREQUENCY),
					Q.where("activity_id", input.activityId),
					Q.where("key_param", input.period),
					Q.where("category_id", ACTIVITY_LEVEL_CATEGORY_ID),
				)
				.fetch();

			const row = existing[0];
			if (row) {
				await row.update((record) => {
					record.value = normalizeFinite(input.value);
					record.sampleSize = Math.max(0, Math.floor(input.sampleSize));
					record.lastUpdated = input.observedAt;
				});
				return;
			}

			await this.collection.create((record) => {
				record.activityId = input.activityId;
				record.categoryId = ACTIVITY_LEVEL_CATEGORY_ID;
				record.metric = UserBehaviorMetric.OBSERVED_FREQUENCY;
				record.keyParam = input.period;
				record.value = normalizeFinite(input.value);
				record.sampleSize = Math.max(0, Math.floor(input.sampleSize));
				record.lastUpdated = input.observedAt;
			});
		});
	}
}
