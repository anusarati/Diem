import { type Database, Q } from "@nozbe/watermelondb";
import type { FrequencyEmaScope } from "../../types/domain";
import type FrequencyEmaState from "../models/FrequencyEmaState";

export interface FrequencyEmaStateUpsertInput {
	activityId: string;
	scope: FrequencyEmaScope;
	emaValue: number;
	sampleSize: number;
	openBucketKey?: string;
	openBucketCount: number;
	lastClosedBucketKey?: string;
	dirty: boolean;
	updatedAt: Date;
}

export class FrequencyEmaStateRepository {
	constructor(private readonly database: Database) {}

	async find(
		activityId: string,
		scope: FrequencyEmaScope,
	): Promise<FrequencyEmaState | null> {
		const rows = await this.database
			.get<FrequencyEmaState>("frequency_ema_state")
			.query(Q.where("activity_id", activityId), Q.where("scope", scope))
			.fetch();
		return rows[0] ?? null;
	}

	async upsert(input: FrequencyEmaStateUpsertInput): Promise<void> {
		await this.database.write(async () => {
			const collection = this.database.get<FrequencyEmaState>(
				"frequency_ema_state",
			);
			const existing = await collection
				.query(
					Q.where("activity_id", input.activityId),
					Q.where("scope", input.scope),
				)
				.fetch();

			const row = existing[0];
			if (row) {
				await row.update((record) => {
					record.emaValue = input.emaValue;
					record.sampleSize = Math.max(0, Math.floor(input.sampleSize));
					record.openBucketKey = input.openBucketKey;
					record.openBucketCount = Math.max(
						0,
						Math.floor(input.openBucketCount),
					);
					record.lastClosedBucketKey = input.lastClosedBucketKey;
					record.dirty = input.dirty;
					record.updatedAt = input.updatedAt;
				});
				return;
			}

			await collection.create((record) => {
				record.activityId = input.activityId;
				record.scope = input.scope;
				record.emaValue = input.emaValue;
				record.sampleSize = Math.max(0, Math.floor(input.sampleSize));
				record.openBucketKey = input.openBucketKey;
				record.openBucketCount = Math.max(0, Math.floor(input.openBucketCount));
				record.lastClosedBucketKey = input.lastClosedBucketKey;
				record.dirty = input.dirty;
				record.updatedAt = input.updatedAt;
			});
		});
	}

	async markDirtyForActivity(
		activityId: string,
		updatedAt: Date,
	): Promise<void> {
		await this.database.write(async () => {
			const collection = this.database.get<FrequencyEmaState>(
				"frequency_ema_state",
			);
			const rows = await collection
				.query(Q.where("activity_id", activityId))
				.fetch();
			await Promise.all(
				rows.map((row) =>
					row.update((record) => {
						record.dirty = true;
						record.updatedAt = updatedAt;
					}),
				),
			);
		});
	}

	async listDirtyOrStale(staleBefore: Date): Promise<FrequencyEmaState[]> {
		return this.database
			.get<FrequencyEmaState>("frequency_ema_state")
			.query(
				Q.or(
					Q.where("dirty", true),
					Q.where("updated_at", Q.lte(staleBefore.getTime())),
				),
			)
			.fetch();
	}
}
