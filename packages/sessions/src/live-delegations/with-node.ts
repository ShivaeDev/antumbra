export const withNode = (
	current: ReadonlyMap<string, ReadonlySet<string>>,
	rootSessionId: string,
	nodeSessionId: string,
): ReadonlyMap<string, ReadonlySet<string>> => {
	const nodes = new Set(current.get(rootSessionId) ?? []);
	nodes.add(nodeSessionId);
	return new Map(current).set(rootSessionId, nodes);
};
