export const withoutNode = (
	current: ReadonlyMap<string, ReadonlySet<string>>,
	rootSessionId: string,
	nodeSessionId: string,
): ReadonlyMap<string, ReadonlySet<string>> => {
	const nodes = new Set(current.get(rootSessionId) ?? []);
	nodes.delete(nodeSessionId);
	const next = new Map(current);
	if (nodes.size === 0) {
		next.delete(rootSessionId);
	} else {
		next.set(rootSessionId, nodes);
	}
	return next;
};
