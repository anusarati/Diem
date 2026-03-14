import {
	makeRepositories,
	resolveCurrentScope,
} from "../../app/data/services/repositoryContext";
import { BridgeDataSource } from "../../bridge/assembly/bridge_data_source";
import { ProblemBuilder } from "../../bridge/assembly/problem_builder";
import { NativeScheduler } from "../../bridge/jsi/native_scheduler";
import { getDatabase } from "../../data/database";
import type ScheduledEvent from "../../data/models/ScheduledEvent";
import {
	ActivitySource,
	EventStatus,
	Replaceability,
} from "../../types/domain";

export class SolverOrchestrator {
	private readonly scheduler: NativeScheduler;

	constructor() {
		this.scheduler = new NativeScheduler();
	}

	/**
	 * Runs the solver for a given time horizon and updates the database with the results.
	 */
	async solveAndSynchronize(horizonStart: Date, totalSlots: number = 96) {
		// Default 24h
		const { scope } = await resolveCurrentScope();
		const database = getDatabase(scope);
		const dataSource = new BridgeDataSource(database);
		const builder = new ProblemBuilder();
		const repositories = makeRepositories(scope);

		// 1. Load data from DB
		const input = await dataSource.load({
			horizonStart,
			totalSlots,
		});

		// 2. Build the problem
		const built = builder.build(input);

		// 3. Solve
		const results = this.scheduler.solve(built, {
			maxGenerations: 100,
			timeLimitMs: 500,
		});

		// 4. Update Database
		await database.write(async () => {
			for (const result of results) {
				const activityId = result.activityId;

				const startOffsetMinutes = result.startSlot * 15;
				const startTime = new Date(
					horizonStart.getTime() + startOffsetMinutes * 60000,
				);
				const endTime = new Date(
					startTime.getTime() + result.durationSlots * 15 * 60000,
				);

				// Find existing or create new
				const existing = await repositories.schedule.listAll();
				const match = (existing as ScheduledEvent[]).find(
					(e) =>
						e.activityId === activityId &&
						new Date(e.startTime).toDateString() === startTime.toDateString(),
				);

				if (match) {
					// Use repository update to handle WatermelonDB model logic
					await repositories.schedule.update(match.id, {
						startTime,
						endTime,
						updatedAt: new Date(),
					});
				} else {
					const activity = await repositories.activity.findById(activityId);
					if (activity) {
						await repositories.schedule.create({
							activityId: activityId,
							categoryId: activity.categoryId,
							title: activity.name,
							startTime,
							endTime,
							duration: result.durationSlots * 15,
							status: EventStatus.CONFIRMED,
							replaceabilityStatus: Replaceability.SOFT,
							priority: activity.priority,
							source: ActivitySource.AUTONOMOUS,
							isLocked: false,
							isRecurring: false,
							createdAt: new Date(),
							updatedAt: new Date(),
						});
					}
				}
			}
		});

		return results;
	}

	/**
	 * Convenience method to delay a specific activity and re-solve.
	 */
	async delayActivity(_activityId: string, _delayMinutes: number = 30) {
		const now = new Date();
		// Full re-solve from now
		return this.solveAndSynchronize(now);
	}
}

export const solverOrchestrator = new SolverOrchestrator();
