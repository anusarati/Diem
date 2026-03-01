import type { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { createAdapterBaseOptions, getScopedDatabase } from "./database.shared";

export function getDatabase(scope = "default"): Database {
	return getScopedDatabase(
		scope,
		(dbName) =>
			new SQLiteAdapter({
				...createAdapterBaseOptions(dbName),
				jsi: true,
			}),
	);
}
