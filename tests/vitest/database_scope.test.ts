import { afterEach, describe, expect, it } from "vitest";
import { getDatabase } from "../../src/data/database";
import { ActivityRepository } from "../../src/data/repositories";

const touchedScopes = new Set<string>();

function databaseForScope(scope: string) {
	touchedScopes.add(scope);
	return getDatabase(scope);
}

afterEach(async () => {
	for (const scope of touchedScopes) {
		const database = getDatabase(scope);
		await database.write(async () => {
			await database.unsafeResetDatabase();
		});
	}
	touchedScopes.clear();
});

describe("database scope cache", () => {
	it("returns the same instance for equivalent sanitized scopes", () => {
		const seed = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const dbA = databaseForScope(`user-${seed}`);
		const dbB = databaseForScope(`user_${seed}`);
		expect(dbA).toBe(dbB);
	});

	it("returns different instances for different scopes", () => {
		const seed = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const dbA = databaseForScope(`scope_a_${seed}`);
		const dbB = databaseForScope(`scope_b_${seed}`);
		expect(dbA).not.toBe(dbB);
	});

	it("keeps data isolated between different scopes", async () => {
		const seed = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const scopeA = `scope_isolation_a_${seed}`;
		const scopeB = `scope_isolation_b_${seed}`;
		const repoA = new ActivityRepository(databaseForScope(scopeA));
		const repoB = new ActivityRepository(databaseForScope(scopeB));

		await repoA.create({
			categoryId: "Work",
			name: "Scope A only",
			priority: 3,
			defaultDuration: 30,
			isReplaceable: true,
			color: "#222222",
			createdAt: new Date("2026-02-27T10:00:00.000Z"),
		});

		const listA = await repoA.list();
		const listB = await repoB.list();

		expect(listA.length).toBe(1);
		expect(listA[0].name).toBe("Scope A only");
		expect(listB.length).toBe(0);
	});
});
