import type { HybridObject } from "react-native-nitro-modules";

export interface DiemScheduler
	extends HybridObject<{ ios: "c++"; android: "c++" }> {
	solve(
		problemData: ArrayBuffer,
		maxGenerations: number,
		timeLimitMs: number,
	): ArrayBuffer;
}
