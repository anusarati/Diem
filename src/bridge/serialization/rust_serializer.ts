import { type as arkType } from "arktype";
import { pack, unpack } from "msgpackr";
import type { RustProblem, SolveResultTuple } from "../types";

const unknownArrayType = arkType("unknown[]");
const solveResultTupleType = arkType(["number", "number"]);

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
	const backingBuffer = bytes.buffer;
	if (
		backingBuffer instanceof ArrayBuffer &&
		bytes.byteOffset === 0 &&
		bytes.byteLength === backingBuffer.byteLength
	) {
		return backingBuffer;
	}
	return bytes.slice().buffer as ArrayBuffer;
};

export const serializeProblem = (problem: RustProblem): ArrayBuffer => {
	const encoded = pack(problem) as Uint8Array;
	return toArrayBuffer(encoded);
};

export const deserializeSolveResult = (
	payload: ArrayBuffer,
): SolveResultTuple[] => {
	if (payload.byteLength === 0) {
		return [];
	}

	const decoded = unpack(new Uint8Array(payload));
	if (!unknownArrayType.allows(decoded)) {
		throw new Error("Unexpected solve result payload format.");
	}

	const tuples: SolveResultTuple[] = [];
	for (const row of decoded) {
		if (!solveResultTupleType.allows(row)) {
			throw new Error("Malformed solve result tuple.");
		}

		const [activityId, startSlot] = row as [number, number];
		if (
			!Number.isInteger(activityId) ||
			!Number.isInteger(startSlot) ||
			activityId < 0 ||
			startSlot < 0
		) {
			throw new Error(
				"Solve result tuple values must be non-negative integers.",
			);
		}
		tuples.push([activityId, startSlot]);
	}

	return tuples;
};
