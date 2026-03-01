import type { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { createAdapterBaseOptions, getScopedDatabase } from "./database.shared";

export function getDatabase(scope = "default"): Database {
	return getScopedDatabase(
		scope,
		(dbName) =>
			new LokiJSAdapter({
				...createAdapterBaseOptions(dbName),
				useWebWorker: false,
				useIncrementalIndexedDB: true,
			}),
	);
}
