import { type as arkType } from "arktype";
import type { HNetPairType, HNetTimeScope } from "../types/domain";

export interface CompletedActivityEvent {
	activityId: string;
	startTime: Date;
	durationMinutes: number;
}

export interface MarkovTransitionCountUpdate {
	fromActivityId: string;
	toActivityId: string;
	count: number;
	lastObservedAt: Date;
}

export interface HNetArcCountUpdate {
	predecessorActivityId: string;
	successorActivityId: string;
	timeScope: HNetTimeScope;
	weekdayMask: number;
	count: number;
	lastObservedAt: Date;
}

export interface HNetPairCountUpdate {
	anchorActivityId: string;
	firstActivityId: string;
	secondActivityId: string;
	pairType: HNetPairType;
	timeScope: HNetTimeScope;
	weekdayMask: number;
	coOccurrenceCount: number;
	anchorSampleSize: number;
	lastObservedAt: Date;
}

export interface MinedHeuristicBatch {
	arcs: HNetArcCountUpdate[];
	pairs: HNetPairCountUpdate[];
}

const unknownArrayType = arkType("unknown[]");
const completedActivityEventType = arkType({
	activityId: "string",
	startTime: "Date",
	durationMinutes: "number",
});

export function assertCompletedActivityEventBatch(
	events: unknown,
	source = "CompletedActivityEvent[]",
): asserts events is CompletedActivityEvent[] {
	if (!unknownArrayType.allows(events)) {
		throw new Error(`${source} must be an array.`);
	}

	events.forEach((event, index) => {
		if (!completedActivityEventType.allows(event)) {
			throw new Error(
				`${source}[${index}] is not a valid CompletedActivityEvent.`,
			);
		}

		const typed = event as CompletedActivityEvent;
		if (!Number.isFinite(typed.durationMinutes) || typed.durationMinutes <= 0) {
			throw new Error(
				`${source}[${index}].durationMinutes must be a positive number.`,
			);
		}
		if (!Number.isFinite(typed.startTime.getTime())) {
			throw new Error(`${source}[${index}].startTime must be a valid Date.`);
		}
	});
}
