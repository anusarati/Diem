import { slotToDate } from "../assembly/time_slots";
import type { BuiltProblem, SolveResultTuple } from "../types";

export interface ParsedScheduleResult {
	activityId: string;
	startSlot: number;
	startTime: Date;
	durationSlots: number;
}

export const parseSolveResult = (
	tuples: SolveResultTuple[],
	context: BuiltProblem,
): ParsedScheduleResult[] => {
	// Create a map from numeric ID to duration for easy lookup
	const durationMap = new Map<number, number>();
	for (const activity of context.problem.activities) {
		durationMap.set(activity.id, activity.duration_slots);
	}

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
				durationSlots: durationMap.get(numericId) || 0,
			};
		})
		.filter((item): item is ParsedScheduleResult => item !== null);
};
