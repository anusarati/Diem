export function assignFields<TTarget extends object>(
	target: TTarget,
	patch: Partial<TTarget>,
): void {
	Object.assign(target, patch);
}

export function assignDefinedFields<TTarget extends object>(
	target: TTarget,
	patch: Partial<TTarget>,
): void {
	const definedPatch: Partial<TTarget> = {};
	for (const key of Object.keys(patch) as Array<keyof TTarget>) {
		const value = patch[key];
		if (value !== undefined) {
			definedPatch[key] = value;
		}
	}
	Object.assign(target, definedPatch);
}

export function assignRawId(
	record: { _raw: { id: string } },
	id?: string,
): void {
	if (!id) {
		return;
	}
	record._raw.id = id;
}

export function stripId<T extends { id?: string }>(value: T): Omit<T, "id"> {
	const { id: _id, ...rest } = value;
	return rest;
}
