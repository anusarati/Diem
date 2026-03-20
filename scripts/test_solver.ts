import { execSync } from "child_process";
import * as fs from "fs";
import {
	ProblemBuilder,
	type ProblemBuilderInput,
} from "../src/bridge/assembly/problem_builder";
import {
	Replaceability,
	TimeScope,
	UserBehaviorMetric,
} from "../src/types/domain";

// Helper to construct deterministic ProblemBuilderInput
function buildScenarioInput(options: {
	withGymConstraint?: boolean;
	withGymMaxConstraint?: boolean;
	withGymMin5Constraint?: boolean;
	withShowerConstraint?: boolean;
	withForbiddenZone?: boolean;
}): ProblemBuilderInput {
	const horizonStart = new Date("2026-03-19T12:15:00"); // Thursday 12:15 PM local
	const totalSlots = 335; // 384 - 49 slots

	const activities = [
		{ id: "Study", categoryId: "Work", defaultDuration: 60, priority: 3 },
		{ id: "Gym", categoryId: "Health", defaultDuration: 60, priority: 2 },
		{ id: "Shower", categoryId: "Health", defaultDuration: 30, priority: 1 },
	] as any[];

	const userBehavior = [
		// STUDY
		{
			id: "s-1",
			activityId: "Study",
			metric: UserBehaviorMetric.OBSERVED_FREQUENCY,
			period: "DAILY",
			value: 1.0,
		},
		{
			id: "s-2",
			activityId: "Study",
			metric: UserBehaviorMetric.HEATMAP_PROBABILITY,
			keyParam: "36",
			value: 1.0,
		}, // 9 AM

		// GYM - historically 3 items over 11 days (around 0.27/day and 2/week)
		{
			id: "g-1",
			activityId: "Gym",
			metric: UserBehaviorMetric.OBSERVED_FREQUENCY,
			period: "DAILY",
			value: 0.27,
		},
		{
			id: "g-2",
			activityId: "Gym",
			metric: UserBehaviorMetric.OBSERVED_FREQUENCY,
			period: "WEEKLY",
			value: 2.0,
		},
		{
			id: "g-3",
			activityId: "Gym",
			metric: UserBehaviorMetric.HEATMAP_PROBABILITY,
			keyParam: "48",
			value: 0.33,
		}, // 12 PM
		{
			id: "g-4",
			activityId: "Gym",
			metric: UserBehaviorMetric.HEATMAP_PROBABILITY,
			keyParam: "60",
			value: 0.33,
		}, // 3 PM
		{
			id: "g-5",
			activityId: "Gym",
			metric: UserBehaviorMetric.HEATMAP_PROBABILITY,
			keyParam: "56",
			value: 0.33,
		}, // 2 PM

		// SHOWER - historically 3 items following Gym
		{
			id: "sh-1",
			activityId: "Shower",
			metric: UserBehaviorMetric.OBSERVED_FREQUENCY,
			period: "DAILY",
			value: 0.27,
		},
		{
			id: "sh-2",
			activityId: "Shower",
			metric: UserBehaviorMetric.OBSERVED_FREQUENCY,
			period: "WEEKLY",
			value: 2.0,
		},
		{
			id: "sh-3",
			activityId: "Shower",
			metric: UserBehaviorMetric.HEATMAP_PROBABILITY,
			keyParam: "52",
			value: 0.33,
		}, // 1 PM
		{
			id: "sh-4",
			activityId: "Shower",
			metric: UserBehaviorMetric.HEATMAP_PROBABILITY,
			keyParam: "64",
			value: 0.33,
		}, // 4 PM
		{
			id: "sh-5",
			activityId: "Shower",
			metric: UserBehaviorMetric.HEATMAP_PROBABILITY,
			keyParam: "60",
			value: 0.33,
		}, // 3 PM
	] as any[];

	const constraints = [] as any[];

	if (options.withGymConstraint) {
		constraints.push({
			id: "c-gym",
			type: "USER_FREQUENCY_GOAL",
			activityId: "Gym",
			isActive: true,
			value: { scope: TimeScope.SAME_WEEK, minCount: 10 },
		});
	}

	if (options.withGymMin5Constraint) {
		constraints.push({
			id: "c-gym-5",
			type: "USER_FREQUENCY_GOAL",
			activityId: "Gym",
			isActive: true,
			value: { scope: TimeScope.SAME_WEEK, minCount: 5 },
		});
	}

	if (options.withGymMaxConstraint) {
		constraints.push({
			id: "c-gym-max",
			type: "USER_FREQUENCY_GOAL",
			activityId: "Gym",
			isActive: true,
			value: { scope: TimeScope.SAME_WEEK, maxCount: 2 },
		});
	}

	if (options.withShowerConstraint) {
		constraints.push({
			id: "c-shower",
			type: "USER_FREQUENCY_GOAL",
			activityId: "Shower",
			isActive: true,
			value: { scope: TimeScope.SAME_WEEK, minCount: 20 },
		});
	}

	if (options.withForbiddenZone) {
		constraints.push({
			id: "c-forbidden",
			type: "GLOBAL_FORBIDDEN_ZONE",
			isActive: true,
			value: { startSlot: 48, endSlot: 72 }, // 12 PM to 6 PM (Absolute day 0)
		});
	}

	const arcCounts = [
		{
			predecessorActivityId: "Gym",
			successorActivityId: "Shower",
			count: 3,
			timeScope: "SAME_DAY",
			weekdayMask: 127,
		},
	] as any[];

	const pairCounts = [] as any[];
	const markovTransitions = [] as any[];

	return {
		activities,
		constraints,
		userBehavior,
		markovTransitions,
		hnetArcCounts: arcCounts,
		hnetPairCounts: pairCounts,
		scheduledEvents: [],
		horizonStart,
		totalSlots,
	};
}

function runSolverForInput(name: string, input: ProblemBuilderInput) {
	console.log(`\n=================================================`);
	console.log(`[Test Scenario] ${name}`);
	console.log(`=================================================`);

	const builder = new ProblemBuilder({
		heuristicOptions: { softBindingWeightScale: 1000 },
	});
	const built = builder.build(input);

	console.log("-> Numeric Activity Mapping:");
	for (const [num, ext] of built.numericToActivityId.entries()) {
		console.log(`    Id ${num} -> ${ext}`);
	}

	console.log(
		`-> Built Problem. Heatmap length: ${built.problem.heatmap.length}`,
	);
	console.log(
		"-> Heatmap entries for Study (Id 2):",
		built.problem.heatmap.filter(([a]) => a === 2),
	);

	const problemJsonPath = "/home/xing/Diem/problem.json";
	fs.writeFileSync(problemJsonPath, JSON.stringify(built.problem, null, 2));

	try {
		console.log("-> Compiling and running Rust solver example...");
		const output = execSync(
			`cargo run --manifest-path /home/xing/Diem/rust/Cargo.toml --example solve_json ${problemJsonPath}`,
		);
		console.log(output.toString());
	} catch (error: any) {
		console.error("Solver execution failed:", error.message);
	}
}

// 1. SCENARIO A: No extra Hard constraints (Standard priors only)
const inputA = buildScenarioInput({});
runSolverForInput("Scenario A: Baseline / Default Priors", inputA);

// 2. SCENARIO B: Min 10 Gyms per Week
const inputB = buildScenarioInput({ withGymConstraint: true });
runSolverForInput("Scenario B: Min 10 Gyms/Week Constraint Added", inputB);

// 3. SCENARIO C: Min 20 Showers per Week
const inputC = buildScenarioInput({ withShowerConstraint: true });
runSolverForInput("Scenario C: Min 20 Showers/Week Constraint Added", inputC);

// 4. SCENARIO D: Max 2 Gyms per Week
const inputD = buildScenarioInput({ withGymMaxConstraint: true });
runSolverForInput("Scenario D: Max 2 Gyms/Week Constraint Added", inputD);

// 5. SCENARIO E: Min 5 Gyms per Week (matches user's real setup)
const inputE = buildScenarioInput({ withGymMin5Constraint: true });
runSolverForInput("Scenario E: Min 5 Gyms/Week Constraint Added", inputE);

// 6. SCENARIO F: ForbiddenZone Constraint (12 PM - 6 PM Day 0)
const inputF = buildScenarioInput({ withForbiddenZone: true });
runSolverForInput("Scenario F: Forbidden Zone (12 PM - 6 PM) Added", inputF);
