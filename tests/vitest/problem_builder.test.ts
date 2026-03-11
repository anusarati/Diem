import { describe, expect, it } from "vitest";
import {
	ProblemBuilder,
	type ProblemBuilderInput,
	type ProblemBuilderResult,
} from "../../src/bridge/assembly/problem_builder";
import type Activity from "../../src/data/models/Activity";
import type ScheduledEvent from "../../src/data/models/ScheduledEvent";
import { Replaceability } from "../../src/types/domain";

function makeActivity(id: string): Activity {
	return {
		id,
		categoryId: "Work",
		defaultDuration: 60,
		priority: 3,
	} as Activity;
}

function makeScheduledEvent(input: {
	id: string;
	startTime: string;
	replaceabilityStatus: Replaceability;
	isLocked: boolean;
}): ScheduledEvent {
	return {
		id: input.id,
		categoryId: "Work",
		duration: 60,
		priority: 2,
		startTime: new Date(input.startTime),
		replaceabilityStatus: input.replaceabilityStatus,
		isLocked: input.isLocked,
	} as ScheduledEvent;
}

function baseInput(): ProblemBuilderInput {
	return {
		activities: [makeActivity("activity-1")],
		constraints: [],
		userBehavior: [],
		markovTransitions: [],
		hnetArcCounts: [],
		hnetPairCounts: [],
		scheduledEvents: [
			makeScheduledEvent({
				id: "soft",
				startTime: "2026-03-10T09:00:00.000Z",
				replaceabilityStatus: Replaceability.SOFT,
				isLocked: false,
			}),
			makeScheduledEvent({
				id: "hard",
				startTime: "2026-03-10T10:00:00.000Z",
				replaceabilityStatus: Replaceability.HARD,
				isLocked: false,
			}),
			makeScheduledEvent({
				id: "locked",
				startTime: "2026-03-10T11:00:00.000Z",
				replaceabilityStatus: Replaceability.SOFT,
				isLocked: true,
			}),
		],
		horizonStart: new Date("2026-03-10T00:00:00.000Z"),
		totalSlots: 96,
	};
}

function fixedExternalIds(result: ProblemBuilderResult): string[] {
	return result.problem.fixed_indices
		.map((idx) => result.problem.activities[idx])
		.map((activity) => result.numericToActivityId.get(activity.id))
		.filter((id): id is string => typeof id === "string");
}

describe("ProblemBuilder scheduleOnlyInEmptyTime", () => {
	it("keeps default behavior (only locked/HARD scheduled events are fixed)", () => {
		const builder = new ProblemBuilder();
		const result = builder.build(baseInput());

		expect(fixedExternalIds(result)).toEqual([
			"scheduled:hard",
			"scheduled:locked",
		]);
		expect(result.problem.floating_indices).toHaveLength(1);
	});

	it("treats all scheduled events as fixed when input flag is enabled", () => {
		const builder = new ProblemBuilder();
		const result = builder.build({
			...baseInput(),
			scheduleOnlyInEmptyTime: true,
		});

		expect(fixedExternalIds(result)).toEqual([
			"scheduled:hard",
			"scheduled:locked",
			"scheduled:soft",
		]);
	});

	it("allows per-build override of constructor default", () => {
		const builder = new ProblemBuilder({ scheduleOnlyInEmptyTime: true });

		const defaultResult = builder.build(baseInput());
		expect(fixedExternalIds(defaultResult)).toContain("scheduled:soft");

		const overrideResult = builder.build(baseInput(), {
			scheduleOnlyInEmptyTime: false,
		});
		expect(fixedExternalIds(overrideResult)).not.toContain("scheduled:soft");
	});
});
