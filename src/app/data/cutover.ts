import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearCurrentUser } from "./auth";

const CUTOVER_MARKER_KEY = "diem_cutover_v2_completed";
const LEGACY_EXACT_KEYS = [
	"diem_users",
	"diem_current_user",
	"diem_users_imported_to_db_v1",
] as const;
const LEGACY_PREFIXES = [
	"diem_tasks_",
	"diem_scheduled_",
	"diem_settings_",
	"diem_legacy_imported_",
] as const;

let cutoverInFlight: Promise<void> | null = null;

export async function runPersistenceCutover(): Promise<void> {
	if (cutoverInFlight) {
		await cutoverInFlight;
		return;
	}

	cutoverInFlight = (async () => {
		const marker = await AsyncStorage.getItem(CUTOVER_MARKER_KEY);
		if (marker === "1") {
			return;
		}

		const keys = await AsyncStorage.getAllKeys();
		const keysToRemove = new Set<string>(LEGACY_EXACT_KEYS);
		for (const key of keys) {
			if (LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
				keysToRemove.add(key);
			}
		}

		if (keysToRemove.size > 0) {
			await AsyncStorage.multiRemove(Array.from(keysToRemove));
		}

		await clearCurrentUser();
		await AsyncStorage.setItem(CUTOVER_MARKER_KEY, "1");
	})();

	try {
		await cutoverInFlight;
	} finally {
		cutoverInFlight = null;
	}
}
