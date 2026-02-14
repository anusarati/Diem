import { slotToDate } from "../assembly/time_slots";
import type { BuiltProblem, SolveResultTuple } from "../types";

export interface ParsedScheduleResult {
	activityId: string;
	startSlot: number;
	startTime: Date;
}

export const parseSolveResult = (
	tuples: SolveResultTuple[],
	context: BuiltProblem,
): ParsedScheduleResult[] => {
	return tuples
		.map((tuple) => {
			const [numericId, slot] = tuple;
			const activityId = context.numericToActivityId.get(numericId);
			if (!activityId) {
				return null;
			}
			if (activityId.startsWith("scheduled:")) {
				return null;
			}
			return {
				activityId,
				startSlot: slot,
				startTime: slotToDate(slot, context.horizonStart),
			};
		})
		.filter((item): item is ParsedScheduleResult => item !== null);
};
