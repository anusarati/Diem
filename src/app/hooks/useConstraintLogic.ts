import { useCallback, useState } from "react";
import {
	ConstraintType,
	type CumulativeTimeValue,
	type ForbiddenZoneValue,
	type FrequencyGoalValue,
	type UserSequenceValue,
} from "../../types/domain";

type ConstraintValue =
	| ForbiddenZoneValue
	| CumulativeTimeValue
	| UserSequenceValue
	| FrequencyGoalValue;

export type ConstraintItem = {
	id: string;
	type: ConstraintType;
	isActive: boolean;
	activityId?: string;
	categoryId?: string;
	value: ConstraintValue;
};

export const useConstraintLogic = (
	initialConstraints: ConstraintItem[] = [],
) => {
	const [constraints, setConstraints] =
		useState<ConstraintItem[]>(initialConstraints);

	const addConstraint = useCallback((type: ConstraintType) => {
		const newConstraint: ConstraintItem = {
			id: Math.random().toString(36).substring(7),
			type,
			isActive: true,
			value: getDefaultValueForType(type),
		};
		setConstraints((prev) => [...prev, newConstraint]);
	}, []);

	const removeConstraint = useCallback((id: string) => {
		setConstraints((prev) => prev.filter((c) => c.id !== id));
	}, []);

	const updateConstraint = useCallback(
		(id: string, updates: Partial<ConstraintItem>) => {
			setConstraints((prev) =>
				prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
			);
		},
		[],
	);

	const validateConstraints = useCallback(() => {
		const errors: Record<string, string> = {};

		constraints.forEach((c) => {
			if (c.type === ConstraintType.USER_SEQUENCE) {
				const val = c.value as UserSequenceValue;
				if (!val.predecessorId || !val.successorId) {
					errors[c.id] = "Both activities in a sequence must be selected";
				} else if (val.predecessorId === val.successorId) {
					errors[c.id] =
						"Predecessor and successor must be different activities";
				}
			}
		});

		return {
			isValid: Object.keys(errors).length === 0,
			errors,
		};
	}, [constraints]);

	return {
		constraints,
		addConstraint,
		removeConstraint,
		updateConstraint,
		validateConstraints,
	};
};

function getDefaultValueForType(type: ConstraintType): ConstraintValue {
	switch (type) {
		case ConstraintType.GLOBAL_FORBIDDEN_ZONE:
			return {
				startSlot: 0,
				endSlot: 10,
			} as ForbiddenZoneValue;

		case ConstraintType.GLOBAL_CUMULATIVE_TIME:
			return {
				periodSlots: 24,
				minDuration: 0,
				maxDuration: 60,
			} as CumulativeTimeValue;

		case ConstraintType.USER_SEQUENCE:
			return {
				predecessorId: "",
				successorId: "",
			} as UserSequenceValue;

		case ConstraintType.USER_FREQUENCY_GOAL:
			return {
				scope: "SAME_DAY",
				minCount: 1,
			} as unknown as FrequencyGoalValue;

		default:
			throw new Error(`Unsupported ConstraintType: ${type}`);
	}
}
