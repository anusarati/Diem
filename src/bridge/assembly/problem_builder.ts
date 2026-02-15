import type Activity from "../../data/models/Activity";
import type Constraint from "../../data/models/Constraint";
import type HNetArcCount from "../../data/models/HNetArcCount";
import type HNetPairCount from "../../data/models/HNetPairCount";
import type MarkovTransitionCount from "../../data/models/MarkovTransitionCount";
import type ScheduledEvent from "../../data/models/ScheduledEvent";
import type UserBehavior from "../../data/models/UserBehavior";
import { Replaceability } from "../../types/domain";
import type { BuiltProblem, RustActivity, RustProblem } from "../types";
import { ConstraintMapper } from "./constraint_mapper";
import {
	HeuristicInjector,
	type HeuristicInjectorOptions,
} from "./heuristic_injector";
import { createDenseIdMaps, getOrThrowDenseId } from "./id_registry";
import { dateToSlot, minutesToSlots } from "./time_slots";

export interface ProblemBuilderInput {
	activities: Activity[];
	constraints: Constraint[];
	userBehavior: UserBehavior[];
	markovTransitions: MarkovTransitionCount[];
	hnetArcCounts: HNetArcCount[];
	hnetPairCounts: HNetPairCount[];
	scheduledEvents?: ScheduledEvent[];
	horizonStart: Date;
	totalSlots: number;
}

export interface ProblemBuilderResult extends BuiltProblem {
	warnings: string[];
}

export interface ProblemBuilderOptions {
	heuristicOptions?: HeuristicInjectorOptions;
}

const syntheticFixedId = (eventId: string): string => `scheduled:${eventId}`;

const isFixedEvent = (event: ScheduledEvent): boolean =>
	event.isLocked || event.replaceabilityStatus === Replaceability.HARD;

const buildFloatingActivity = (
	activity: Activity,
	categoryIdToNumeric: Map<string, number>,
	activityIdToNumeric: Map<string, number>,
): RustActivity => {
	const numericId = getOrThrowDenseId(activityIdToNumeric, activity.id);
	const numericCategory = getOrThrowDenseId(
		categoryIdToNumeric,
		activity.categoryId,
	);
	return {
		id: numericId,
		activity_type: "Floating",
		duration_slots: minutesToSlots(activity.defaultDuration),
		priority: activity.priority,
		assigned_start: null,
		category_id: numericCategory,
		input_bindings: [],
		output_bindings: [],
		frequency_targets: [],
		user_frequency_constraints: [],
	};
};

const buildFixedEventActivity = (
	event: ScheduledEvent,
	horizonStart: Date,
	categoryIdToNumeric: Map<string, number>,
	activityIdToNumeric: Map<string, number>,
): RustActivity => {
	const id = syntheticFixedId(event.id);
	const numericId = getOrThrowDenseId(activityIdToNumeric, id);
	const numericCategory = getOrThrowDenseId(
		categoryIdToNumeric,
		event.categoryId,
	);

	return {
		id: numericId,
		activity_type: "Fixed",
		duration_slots: minutesToSlots(event.duration),
		priority: event.priority,
		assigned_start: dateToSlot(event.startTime, horizonStart),
		category_id: numericCategory,
		input_bindings: [],
		output_bindings: [],
		frequency_targets: [],
		user_frequency_constraints: [],
	};
};

export class ProblemBuilder {
	private readonly constraintMapper: ConstraintMapper;
	private readonly heuristicInjector: HeuristicInjector;

	constructor(options: ProblemBuilderOptions = {}) {
		this.constraintMapper = new ConstraintMapper();
		this.heuristicInjector = new HeuristicInjector(options.heuristicOptions);
	}

	build(input: ProblemBuilderInput): ProblemBuilderResult {
		const warnings: string[] = [];
		const scheduledEvents = input.scheduledEvents ?? [];
		const fixedEvents = scheduledEvents.filter(isFixedEvent);

		const fixedEventBySyntheticId = new Map<string, ScheduledEvent>();
		for (const fixedEvent of fixedEvents) {
			fixedEventBySyntheticId.set(syntheticFixedId(fixedEvent.id), fixedEvent);
		}

		const allActivityIds = [
			...input.activities.map((activity) => activity.id),
			...fixedEvents.map((event) => syntheticFixedId(event.id)),
		];
		const { forward: activityIdToNumeric, reverse: numericToActivityId } =
			createDenseIdMaps(allActivityIds);

		const allCategoryIds = [
			...input.activities.map((activity) => activity.categoryId),
			...fixedEvents.map((event) => event.categoryId),
			...input.constraints
				.map((constraint) => constraint.categoryId)
				.filter((categoryId): categoryId is string => Boolean(categoryId)),
		];
		const { forward: categoryIdToNumeric } = createDenseIdMaps(allCategoryIds);

		const baseActivitiesById = new Map<string, Activity>(
			input.activities.map((activity) => [activity.id, activity]),
		);

		const activities: RustActivity[] = [];
		const floatingIndices: number[] = [];
		const fixedIndices: number[] = [];
		const activitiesByNumericId = new Map<number, RustActivity>();

		const orderedEntries = Array.from(activityIdToNumeric.entries()).sort(
			(left, right) => left[1] - right[1],
		);

		for (const [externalId, numericId] of orderedEntries) {
			const base = baseActivitiesById.get(externalId);
			if (base) {
				const rustActivity = buildFloatingActivity(
					base,
					categoryIdToNumeric,
					activityIdToNumeric,
				);
				activities.push(rustActivity);
				floatingIndices.push(activities.length - 1);
				activitiesByNumericId.set(numericId, rustActivity);
				continue;
			}

			const fixedEvent = fixedEventBySyntheticId.get(externalId);
			if (!fixedEvent) {
				warnings.push(
					`Dropping activity with unresolved source ID: ${externalId}`,
				);
				continue;
			}
			const rustActivity = buildFixedEventActivity(
				fixedEvent,
				input.horizonStart,
				categoryIdToNumeric,
				activityIdToNumeric,
			);
			activities.push(rustActivity);
			fixedIndices.push(activities.length - 1);
			activitiesByNumericId.set(numericId, rustActivity);
		}

		const mappedConstraintResult = this.constraintMapper.map({
			constraints: input.constraints,
			activitiesByNumericId,
			activityIdToNumeric,
			categoryIdToNumeric,
		});
		warnings.push(...mappedConstraintResult.warnings);

		const injected = this.heuristicInjector.inject({
			activitiesByNumericId,
			activityIdToNumeric,
			arcCounts: input.hnetArcCounts,
			pairCounts: input.hnetPairCounts,
			markovTransitions: input.markovTransitions,
			userBehavior: input.userBehavior,
		});
		warnings.push(...injected.warnings);

		const problem: RustProblem = {
			activities,
			floating_indices: floatingIndices,
			fixed_indices: fixedIndices,
			global_constraints: mappedConstraintResult.globalConstraints,
			heatmap: injected.heatmap,
			markov_matrix: injected.markovMatrix,
			total_slots: input.totalSlots,
		};

		return {
			problem,
			activityIdToNumeric,
			numericToActivityId,
			categoryIdToNumeric,
			horizonStart: input.horizonStart,
			warnings,
		};
	}
}
