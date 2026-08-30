// why: a root with nothing left open is dropped rather than kept against an
// empty set, so the keys are the whole answer and no reader has to ask a
// second question of the value.
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
