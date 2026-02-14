import { type Database, Q } from "@nozbe/watermelondb";
import type { HNetTimeScope } from "../../types/domain";
import type HNetArcCount from "../models/HNetArcCount";

export class HeuristicNetArcRepository {
	constructor(private readonly database: Database) {}

	async incrementArc(
		predecessorActivityId: string,
		successorActivityId: string,
		timeScope: HNetTimeScope,
		weekdayMask: number,
		observedAt: Date,
		incrementCount = 1,
	): Promise<void> {
		await this.database.write(async () => {
			const collection = this.database.get<HNetArcCount>("hnet_arc_counts");
			const existing = await collection
				.query(
					Q.where("predecessor_activity_id", predecessorActivityId),
					Q.where("successor_activity_id", successorActivityId),
					Q.where("time_scope", timeScope),
					Q.where("weekday_mask", weekdayMask),
				)
				.fetch();

			const row = existing[0];
			if (row) {
				await row.update((record) => {
					record.count += incrementCount;
					record.lastObservedAt = observedAt;
				});
				return;
			}

			await collection.create((record) => {
				record.predecessorActivityId = predecessorActivityId;
				record.successorActivityId = successorActivityId;
				record.timeScope = timeScope;
				record.weekdayMask = weekdayMask;
				record.count = incrementCount;
				record.lastObservedAt = observedAt;
			});
		});
	}

	async listAll(): Promise<HNetArcCount[]> {
		return this.database.get<HNetArcCount>("hnet_arc_counts").query().fetch();
	}

	async clear(): Promise<void> {
		await this.database.write(async () => {
			const collection = this.database.get<HNetArcCount>("hnet_arc_counts");
			const allRows = await collection.query().fetch();
			await Promise.all(allRows.map((row) => row.destroyPermanently()));
		});
	}
}
