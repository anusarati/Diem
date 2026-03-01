import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { afterEach, describe, expect, it } from "vitest";
import { modelClasses } from "../../src/data/models";
import {
	ActivityRepository,
	ConstraintRepository,
	HistoryRepository,
	ScheduleRepository,
} from "../../src/data/repositories";
import schema from "../../src/data/schema";
import {
	ActivitySource,
	ConstraintType,
	EventStatus,
	Replaceability,
	TimeScope,
} from "../../src/types/domain";

function createTestDatabase(): Database {
	const dbName = `diem_vitest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const adapter = new LokiJSAdapter({
		dbName,
		schema,
		useWebWorker: false,
		useIncrementalIndexedDB: true,
		onSetUpError: (error) => {
			throw error;
		},
	});

	return new Database({
		adapter,
		modelClasses,
	});
}

async function waitUntil(
	condition: () => boolean,
	timeoutMs = 2000,
	intervalMs = 20,
): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		if (condition()) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
	throw new Error("Timed out waiting for condition");
}

describe("repository integration", () => {
	let database: Database | null = null;

	afterEach(async () => {
		if (database) {
			await database.write(async () => {
				await database?.unsafeResetDatabase();
			});
			database = null;
		}
	});

	it("ActivityRepository supports CRUD and observeList", async () => {
		database = createTestDatabase();
		const repository = new ActivityRepository(database);
		const observedSizes: number[] = [];

		const subscription = repository.observeList().subscribe((rows) => {
			observedSizes.push(rows.length);
		});

		try {
			await waitUntil(() => observedSizes.length > 0);
			expect(observedSizes[0]).toBe(0);

			const created = await repository.create({
				categoryId: "Work",
				name: "Deep Work",
				priority: 4,
				defaultDuration: 60,
				isReplaceable: true,
				color: "#123456",
				createdAt: new Date("2026-02-27T09:00:00.000Z"),
			});
			expect(created.id).toBeTruthy();
			await waitUntil(() => observedSizes.includes(1));

			const fetched = await repository.get(created.id);
			expect(fetched?.name).toBe("Deep Work");

			await repository.update(created.id, {
				name: "Deep Focus",
				defaultDuration: 45,
			});
			const updated = await repository.get(created.id);
			expect(updated?.name).toBe("Deep Focus");
			expect(updated?.defaultDuration).toBe(45);

			await repository.delete(created.id);
			await waitUntil(() => observedSizes[observedSizes.length - 1] === 0);
			expect(await repository.get(created.id)).toBeNull();
		} finally {
			subscription.unsubscribe();
		}
	});

	it("ScheduleRepository supports range observe + CRUD", async () => {
		database = createTestDatabase();
		const activityRepository = new ActivityRepository(database);
		const scheduleRepository = new ScheduleRepository(database);

		const activity = await activityRepository.create({
			categoryId: "Work",
			name: "Schedule Anchor",
			priority: 3,
			defaultDuration: 30,
			isReplaceable: true,
			color: "#456789",
			createdAt: new Date("2026-02-27T07:00:00.000Z"),
		});

		const start = new Date("2026-02-27T00:00:00.000Z");
		const end = new Date("2026-02-28T00:00:00.000Z");
		const observedSizes: number[] = [];

		const subscription = scheduleRepository
			.observeRange(start, end)
			.subscribe((rows) => {
				observedSizes.push(rows.length);
			});

		try {
			await waitUntil(() => observedSizes.length > 0);

			const created = await scheduleRepository.create({
				activityId: activity.id,
				categoryId: "Work",
				title: "Standup",
				startTime: new Date("2026-02-27T10:00:00.000Z"),
				endTime: new Date("2026-02-27T10:30:00.000Z"),
				duration: 30,
				status: EventStatus.CONFIRMED,
				replaceabilityStatus: Replaceability.SOFT,
				priority: 3,
				isRecurring: false,
				source: ActivitySource.USER_CREATED,
				isLocked: false,
				createdAt: new Date("2026-02-27T09:50:00.000Z"),
				updatedAt: new Date("2026-02-27T09:50:00.000Z"),
			});
			await waitUntil(() => observedSizes.includes(1));

			await scheduleRepository.update(created.id, {
				status: EventStatus.COMPLETED,
				updatedAt: new Date("2026-02-27T10:31:00.000Z"),
			});
			const fetched = await scheduleRepository.get(created.id);
			expect(fetched?.status).toBe(EventStatus.COMPLETED);

			await scheduleRepository.delete(created.id);
			await waitUntil(() => observedSizes[observedSizes.length - 1] === 0);
		} finally {
			subscription.unsubscribe();
		}
	});

	it("HistoryRepository supports list/observe/record completion", async () => {
		database = createTestDatabase();
		const activityRepository = new ActivityRepository(database);
		const historyRepository = new HistoryRepository(database);

		const activity = await activityRepository.create({
			categoryId: "Health",
			name: "Run",
			priority: 2,
			defaultDuration: 30,
			isReplaceable: true,
			color: "#00AA88",
			createdAt: new Date("2026-02-27T06:00:00.000Z"),
		});

		const start = new Date("2026-02-27T00:00:00.000Z");
		const end = new Date("2026-02-28T00:00:00.000Z");
		const observedSizes: number[] = [];
		const subscription = historyRepository
			.observeByRange(start, end)
			.subscribe((rows) => {
				observedSizes.push(rows.length);
			});

		try {
			await waitUntil(() => observedSizes.length > 0);

			const first = await historyRepository.create({
				activityId: activity.id,
				predictedStartTime: new Date("2026-02-27T07:00:00.000Z"),
				predictedDuration: 30,
				wasCompleted: false,
				wasSkipped: false,
				wasReplaced: false,
				createdAt: new Date("2026-02-27T06:55:00.000Z"),
			});

			await historyRepository.recordCompletion({
				activityId: activity.id,
				predictedStartTime: new Date("2026-02-27T08:00:00.000Z"),
				predictedDuration: 30,
				actualStartTime: new Date("2026-02-27T08:05:00.000Z"),
				actualDuration: 32,
			});

			await waitUntil(() => observedSizes.some((size) => size >= 2));

			await historyRepository.update(first.id, {
				wasCompleted: true,
				actualDuration: 28,
			});

			const rows = await historyRepository.listByActivity(activity.id);
			expect(rows.length).toBe(2);
			expect(rows.some((row) => row.wasCompleted)).toBe(true);

			const deleted = await historyRepository.deleteForActivity(activity.id);
			expect(deleted).toBe(2);
		} finally {
			subscription.unsubscribe();
		}
	});

	it("ConstraintRepository supports active filter, observe, upsert, and setActive", async () => {
		database = createTestDatabase();
		const repository = new ConstraintRepository(database);
		const observedActiveSizes: number[] = [];
		const subscription = repository.observeActive().subscribe((rows) => {
			observedActiveSizes.push(rows.length);
		});

		try {
			await waitUntil(() => observedActiveSizes.length > 0);
			expect(observedActiveSizes[0]).toBe(0);

			const inactive = await repository.create({
				id: "constraint-inactive",
				type: ConstraintType.USER_FREQUENCY_GOAL,
				activityId: "activity-1",
				value: { scope: TimeScope.SAME_DAY, minCount: 1 },
				isActive: false,
				createdAt: new Date("2026-02-27T09:00:00.000Z"),
			});
			expect(inactive.isActive).toBe(false);

			const active = await repository.create({
				id: "constraint-active",
				type: ConstraintType.GLOBAL_FORBIDDEN_ZONE,
				value: { startSlot: 4, endSlot: 8 },
				isActive: true,
				createdAt: new Date("2026-02-27T09:01:00.000Z"),
			});
			expect(active.isActive).toBe(true);
			await waitUntil(() => observedActiveSizes.includes(1));

			await repository.setActive(inactive.id, true);
			await waitUntil(() => observedActiveSizes.includes(2));

			await repository.upsert({
				id: inactive.id,
				type: ConstraintType.USER_FREQUENCY_GOAL,
				activityId: "activity-1",
				value: { scope: TimeScope.SAME_DAY, minCount: 2 },
				isActive: false,
				createdAt: new Date("2026-02-27T09:02:00.000Z"),
			});

			await waitUntil(
				() => observedActiveSizes[observedActiveSizes.length - 1] === 1,
			);
			const activeRows = await repository.listActive();
			expect(activeRows.length).toBe(1);
			expect(activeRows[0].id).toBe("constraint-active");
		} finally {
			subscription.unsubscribe();
		}
	});
});
