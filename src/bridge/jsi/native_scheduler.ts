import { DiemScheduler } from "../../../native-modules/diem-scheduler/src";
import {
	deserializeSolveResult,
	serializeProblem,
} from "../serialization/rust_serializer";
import type { BuiltProblem, SolveResultTuple } from "../types";
import { type ParsedScheduleResult, parseSolveResult } from "./result_parser";

export interface SolveOptions {
	maxGenerations?: number;
	timeLimitMs?: number;
}

const DEFAULT_MAX_GENERATIONS = 60;
const DEFAULT_TIME_LIMIT_MS = 200;

export class NativeScheduler {
	solveRaw(
		context: BuiltProblem,
		options: SolveOptions = {},
	): SolveResultTuple[] {
		const payload = serializeProblem(context.problem);
		const rawResult = DiemScheduler.solve(
			payload,
			options.maxGenerations ?? DEFAULT_MAX_GENERATIONS,
			options.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS,
		);
		return deserializeSolveResult(rawResult);
	}

	solve(
		context: BuiltProblem,
		options: SolveOptions = {},
	): ParsedScheduleResult[] {
		const tuples = this.solveRaw(context, options);
		return parseSolveResult(tuples, context);
	}
}
