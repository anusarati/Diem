import type { HNetTimeScope, TimeScope } from "../../types/domain";

export interface HeuristicNetIRArc {
	predecessorId: string;
	successorId: string;
	timeScope: HNetTimeScope;
	weekdayMask: number;
	forwardCount: number;
	reverseCount: number;
	dependencyScore: number;
}

export type HeuristicBindingDirection = "input" | "output";

export interface HeuristicNetIRBinding {
	activityNumericId: number;
	direction: HeuristicBindingDirection;
	timeScope: TimeScope;
	weekdayMask: number;
	requiredSets: number[][];
	weight: number;
	confidence: number;
}

export interface HeuristicNetIR {
	arcs: HeuristicNetIRArc[];
	bindings: HeuristicNetIRBinding[];
}
