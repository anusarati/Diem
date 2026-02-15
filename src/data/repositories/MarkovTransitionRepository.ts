import { type Database, Q } from "@nozbe/watermelondb";
import type MarkovTransitionCount from "../models/MarkovTransitionCount";

export class MarkovTransitionRepository {
	constructor(private readonly database: Database) {}

	async incrementTransition(
		fromActivityId: string,
		toActivityId: string,
		observedAt: Date,
		incrementCount = 1,
	): Promise<void> {
		await this.database.write(async () => {
			const collection = this.database.get<MarkovTransitionCount>(
				"markov_transition_counts",
			);
			const existing = await collection
				.query(
					Q.where("from_activity_id", fromActivityId),
					Q.where("to_activity_id", toActivityId),
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
				record.fromActivityId = fromActivityId;
				record.toActivityId = toActivityId;
				record.count = incrementCount;
				record.lastObservedAt = observedAt;
			});
		});
	}

	async listAll(): Promise<MarkovTransitionCount[]> {
		return this.database
			.get<MarkovTransitionCount>("markov_transition_counts")
			.query()
			.fetch();
	}

	async clear(): Promise<void> {
		await this.database.write(async () => {
			const collection = this.database.get<MarkovTransitionCount>(
				"markov_transition_counts",
			);
			const allRows = await collection.query().fetch();
			await Promise.all(allRows.map((row) => row.destroyPermanently()));
		});
	}
}
