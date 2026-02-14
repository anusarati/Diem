import { type Database, Q } from "@nozbe/watermelondb";
import type { HNetPairType, HNetTimeScope } from "../../types/domain";
import type HNetPairCount from "../models/HNetPairCount";

const sortPair = (firstId: string, secondId: string): [string, string] => {
	if (firstId <= secondId) {
		return [firstId, secondId];
	}
	return [secondId, firstId];
};

export class HeuristicNetPairRepository {
	constructor(private readonly database: Database) {}

	async incrementPair(
		anchorActivityId: string,
		firstActivityId: string,
		secondActivityId: string,
		pairType: HNetPairType,
		timeScope: HNetTimeScope,
		weekdayMask: number,
		observedAt: Date,
		coOccurrenceIncrement = 1,
		anchorSampleIncrement = coOccurrenceIncrement,
	): Promise<void> {
		const [first, second] = sortPair(firstActivityId, secondActivityId);

		await this.database.write(async () => {
			const collection = this.database.get<HNetPairCount>("hnet_pair_counts");
			const existing = await collection
				.query(
					Q.where("anchor_activity_id", anchorActivityId),
					Q.where("first_activity_id", first),
					Q.where("second_activity_id", second),
					Q.where("pair_type", pairType),
					Q.where("time_scope", timeScope),
					Q.where("weekday_mask", weekdayMask),
				)
				.fetch();

			const row = existing[0];
			if (row) {
				await row.update((record) => {
					record.coOccurrenceCount += coOccurrenceIncrement;
					record.anchorSampleSize += anchorSampleIncrement;
					record.lastObservedAt = observedAt;
				});
				return;
			}

			await collection.create((record) => {
				record.anchorActivityId = anchorActivityId;
				record.firstActivityId = first;
				record.secondActivityId = second;
				record.pairType = pairType;
				record.timeScope = timeScope;
				record.weekdayMask = weekdayMask;
				record.coOccurrenceCount = coOccurrenceIncrement;
				record.anchorSampleSize = anchorSampleIncrement;
				record.lastObservedAt = observedAt;
			});
		});
	}

	async listAll(): Promise<HNetPairCount[]> {
		return this.database.get<HNetPairCount>("hnet_pair_counts").query().fetch();
	}

	async clear(): Promise<void> {
		await this.database.write(async () => {
			const collection = this.database.get<HNetPairCount>("hnet_pair_counts");
			const allRows = await collection.query().fetch();
			await Promise.all(allRows.map((row) => row.destroyPermanently()));
		});
	}
}
