export interface DenseIdMaps {
	forward: Map<string, number>;
	reverse: Map<number, string>;
}

export const createDenseIdMaps = (ids: Iterable<string>): DenseIdMaps => {
	const sorted = Array.from(new Set(ids)).sort((a, b) => a.localeCompare(b));
	const forward = new Map<string, number>();
	const reverse = new Map<number, string>();

	sorted.forEach((id, index) => {
		forward.set(id, index);
		reverse.set(index, id);
	});

	return { forward, reverse };
};

export const getOrThrowDenseId = (
	map: Map<string, number>,
	key: string,
): number => {
	const id = map.get(key);
	if (id === undefined) {
		throw new Error(`Missing dense ID for key: ${key}`);
	}
	return id;
};
