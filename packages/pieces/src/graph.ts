import type { EdgeRow } from "#model.ts";

// why: adding "from gates to" closes a loop exactly when `to` already reaches
// `from`, so the walk starts at `to` and looks for `from`.
export const wouldCycle = (
	edges: ReadonlyArray<EdgeRow>,
	from: string,
	to: string,
): boolean => {
	const seen = new Set<string>();
	const frontier = [to];
	while (frontier.length > 0) {
		const at = frontier.pop();
		if (at === undefined || seen.has(at)) {
			continue;
		}
		if (at === from) {
			return true;
		}
		seen.add(at);
		for (const edge of edges) {
			if (edge.fromPieceId === at) {
				frontier.push(edge.toPieceId);
			}
		}
	}
	return false;
};
