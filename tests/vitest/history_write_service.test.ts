import { describe, expect, it, vi } from "vitest";
import { HistoryWriteService } from "../../src/mining/processor/history_write_service";

function buildServiceHarness() {
	let completionRecord: Record<string, unknown> | null = null;

	const historyRepository = {
		upsertCompletion: vi.fn(
			async (input: Record<string, unknown> & { historyId?: string }) => {
				completionRecord = input;
				return {
					id: input.historyId ?? "history-created",
					...input,
				};
			},
		),
	};

	const frequencyStateRepository = {
		markDirtyForActivity: vi.fn(async () => undefined),
	};

	const userBehaviorRepository = {
		upsertObservedFrequency: vi.fn(async () => undefined),
	};

	const database = {
		write: vi.fn(async <T>(work: () => Promise<T> | T) => work()),
	};

	const ingestCompletion = vi.fn(async () => undefined);
	const reconcile = vi.fn(async () => ({ reconciled: 0 }));

	const service = new HistoryWriteService(database as never, {
		frequencyMiner: {
			ingestCompletion,
			reconcile,
		} as never,
		historyRepository: historyRepository as never,
		frequencyStateRepository: frequencyStateRepository as never,
		userBehaviorRepository: userBehaviorRepository as never,
	});

	return {
		service,
		historyRepository,
		frequencyStateRepository,
		getCompletionRecord: () => completionRecord,
		ingestCompletion,
		reconcile,
	};
}

describe("HistoryWriteService", () => {
	it("writes a completion row and invokes mining ingest", async () => {
		const harness = buildServiceHarness();

		const id = await harness.service.recordCompletion({
			activityId: "activity-1",
			predictedStartTime: new Date("2026-02-27T10:00:00.000Z"),
			predictedDuration: 30,
			actualStartTime: new Date("2026-02-27T10:30:00.000Z"),
			actualDuration: 45,
			timeZone: "UTC",
		});

		expect(id).toBe("history-created");
		expect(harness.historyRepository.upsertCompletion).toHaveBeenCalledTimes(1);
		expect(harness.ingestCompletion).toHaveBeenCalledTimes(1);
		expect(harness.ingestCompletion.mock.calls[0][0]).toEqual({
			activityId: "activity-1",
			startTime: new Date("2026-02-27T10:30:00.000Z"),
			durationMinutes: 45,
		});

		const created = harness.getCompletionRecord();
		expect(created).not.toBeNull();
		expect(created?.predictedDuration).toBe(30);
		expect(created?.actualDuration).toBe(45);
		expect(created?.localDayBucket).toBeTypeOf("string");
		expect(created?.localWeekBucket).toBeTypeOf("string");
		expect(created?.localMonthBucket).toBeTypeOf("string");
		expect(created?.bucketTimezone).toBe("UTC");
	});

	it("updates an existing history row when historyId is provided", async () => {
		const harness = buildServiceHarness();

		const id = await harness.service.recordCompletion({
			historyId: "history-existing",
			activityId: "activity-2",
			predictedStartTime: new Date("2026-02-27T11:00:00.000Z"),
			predictedDuration: 25,
			actualStartTime: new Date("2026-02-27T11:15:00.000Z"),
			actualDuration: 20,
			timeZone: "UTC",
			wasSkipped: false,
			wasReplaced: true,
			notes: "replaced by short task",
		});

		expect(id).toBe("history-existing");
		expect(harness.historyRepository.upsertCompletion).toHaveBeenCalledWith(
			expect.objectContaining({
				historyId: "history-existing",
				activityId: "activity-2",
				predictedDuration: 25,
				actualDuration: 20,
				wasReplaced: true,
				notes: "replaced by short task",
			}),
		);
		expect(harness.ingestCompletion).toHaveBeenCalledTimes(1);

		const updated = harness.getCompletionRecord();
		expect(updated?.activityId).toBe("activity-2");
		expect(updated?.predictedDuration).toBe(25);
		expect(updated?.actualDuration).toBe(20);
		expect(updated?.wasReplaced).toBe(true);
		expect(updated?.notes).toBe("replaced by short task");
	});

	it("delegates mark dirty and reconcile to mining dependencies", async () => {
		const harness = buildServiceHarness();

		await harness.service.markActivityDirty("activity-3");
		expect(
			harness.frequencyStateRepository.markDirtyForActivity,
		).toHaveBeenCalledTimes(1);
		expect(
			harness.frequencyStateRepository.markDirtyForActivity.mock.calls[0][0],
		).toBe("activity-3");
		expect(
			harness.frequencyStateRepository.markDirtyForActivity.mock.calls[0][1],
		).toBeInstanceOf(Date);

		await harness.service.reconcileLearnedFrequency("UTC", ["activity-3"]);
		expect(harness.reconcile).toHaveBeenCalledTimes(1);
		expect(harness.reconcile.mock.calls[0][0]).toMatchObject({
			repositories: {
				historyRepository: harness.historyRepository,
			},
			timeZone: "UTC",
			staleActivities: ["activity-3"],
		});
	});
});
