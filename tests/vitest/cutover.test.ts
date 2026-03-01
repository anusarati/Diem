import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = {
	getItem: vi.fn(),
	getAllKeys: vi.fn(),
	multiRemove: vi.fn(),
	setItem: vi.fn(),
};

const auth = {
	clearCurrentUser: vi.fn(),
};

async function importCutover() {
	vi.resetModules();

	vi.doMock("@react-native-async-storage/async-storage", () => ({
		default: storage,
	}));
	vi.doMock("../../src/app/data/auth", () => auth);

	return import("../../src/app/data/cutover");
}

describe("runPersistenceCutover", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		storage.getItem.mockResolvedValue(null);
		storage.getAllKeys.mockResolvedValue([]);
		storage.multiRemove.mockResolvedValue(undefined);
		storage.setItem.mockResolvedValue(undefined);
		auth.clearCurrentUser.mockResolvedValue(undefined);
	});

	it("clears legacy keys, clears session, and sets marker when needed", async () => {
		storage.getAllKeys.mockResolvedValue([
			"diem_users",
			"diem_current_user",
			"diem_tasks_u1_2026-02-27",
			"diem_scheduled_u1",
			"diem_settings_u1",
			"diem_legacy_imported_u1",
			"keep_me",
		]);

		const { runPersistenceCutover } = await importCutover();
		await runPersistenceCutover();

		expect(storage.multiRemove).toHaveBeenCalledTimes(1);
		const [removedKeys] = storage.multiRemove.mock.calls[0] as [string[]];
		expect(removedKeys).toContain("diem_users");
		expect(removedKeys).toContain("diem_current_user");
		expect(removedKeys).toContain("diem_tasks_u1_2026-02-27");
		expect(removedKeys).toContain("diem_scheduled_u1");
		expect(removedKeys).toContain("diem_settings_u1");
		expect(removedKeys).toContain("diem_legacy_imported_u1");
		expect(removedKeys).not.toContain("keep_me");
		expect(auth.clearCurrentUser).toHaveBeenCalledTimes(1);
		expect(storage.setItem).toHaveBeenCalledWith(
			"diem_cutover_v2_completed",
			"1",
		);
	});

	it("is a no-op when marker already exists", async () => {
		storage.getItem.mockResolvedValue("1");

		const { runPersistenceCutover } = await importCutover();
		await runPersistenceCutover();

		expect(storage.getAllKeys).not.toHaveBeenCalled();
		expect(storage.multiRemove).not.toHaveBeenCalled();
		expect(auth.clearCurrentUser).not.toHaveBeenCalled();
		expect(storage.setItem).not.toHaveBeenCalled();
	});
});
