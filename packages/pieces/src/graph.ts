import type { EdgeRow } from "#model.ts";

export const reachablePieces = (edges: ReadonlyArray<EdgeRow>, pieceId: string): ReadonlySet<string> => {
	const outgoing = Map.groupBy(edges, (edge) => edge.fromPieceId);
	const seen = new Set<string>();
	const frontier = [pieceId];
	while (frontier.length > 0) {
		const at = frontier.pop();
		if (at === undefined || seen.has(at)) {
			continue;
		}
		seen.add(at);
		for (const edge of outgoing.get(at) ?? []) {
			frontier.push(edge.toPieceId);
		}
	}
	return seen;
};
