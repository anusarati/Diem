import { Database } from "@nozbe/watermelondb";
import migrations from "./migrations";
import { modelClasses } from "./models";
import schema from "./schema";

type AdapterFactory = (dbName: string) => unknown;

const databaseInstances = new Map<string, Database>();
const DB_NAME_PREFIX = "diem";

const sanitizeScope = (scope: string): string => {
	const normalized = scope.trim();
	if (!normalized) {
		return "default";
	}
	return normalized.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64) || "default";
};

const dbNameForScope = (scope: string): string => {
	const safeScope = sanitizeScope(scope);
	if (safeScope === "default") {
		return DB_NAME_PREFIX;
	}
	return `${DB_NAME_PREFIX}_${safeScope}`;
};

export function createAdapterBaseOptions(dbName: string) {
	return {
		dbName,
		schema,
		migrations,
		onSetUpError: (error: unknown) => {
			console.error("WatermelonDB setup failed", error);
		},
	};
}

export function getScopedDatabase(
	scope: string,
	adapterFactory: AdapterFactory,
): Database {
	const safeScope = sanitizeScope(scope);
	const existing = databaseInstances.get(safeScope);
	if (existing) {
		return existing;
	}

	const dbName = dbNameForScope(safeScope);
	const adapter = adapterFactory(dbName);

	const database = new Database({
		adapter: adapter as never,
		modelClasses,
	});
	databaseInstances.set(safeScope, database);

	return database;
}
