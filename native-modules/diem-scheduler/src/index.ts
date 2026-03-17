import { NitroModules } from "react-native-nitro-modules";
import type { DiemScheduler as DiemSchedulerSpec } from "./DiemScheduler.nitro";

export let DiemScheduler: DiemSchedulerSpec;

try {
	DiemScheduler =
		NitroModules.createHybridObject<DiemSchedulerSpec>("DiemScheduler");
} catch (_e) {
	console.warn(
		"DiemScheduler native module is not available. Are you running in Expo Go? Scheduling will not work.",
	);
}
