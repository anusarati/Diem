import { NitroModules } from "react-native-nitro-modules";
import type { DiemScheduler as DiemSchedulerSpec } from "./DiemScheduler.nitro";

export const DiemScheduler =
	NitroModules.createHybridObject<DiemSchedulerSpec>("DiemScheduler");
