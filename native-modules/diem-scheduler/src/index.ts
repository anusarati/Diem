import { NitroModules } from "react-native-nitro-modules";
import type { DiemScheduler as DiemSchedulerSpec } from "./DiemScheduler.nitro";

export let DiemScheduler: DiemSchedulerSpec | null = null;

try {
	DiemScheduler =
		NitroModules.createHybridObject<DiemSchedulerSpec>("DiemScheduler");
} catch (error) {
	console.error("[DiemScheduler] Failed to load Nitro module:", error);
}
