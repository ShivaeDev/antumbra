import type { PieceId } from "#piece.ts";

export const downstreamOf = (wires: readonly { readonly from: PieceId; readonly to: PieceId }[], id: PieceId): ReadonlySet<PieceId> => {
	const onward = Map.groupBy(wires, (wire) => wire.from);
	const reached = new Set<PieceId>();
	const frontier = [id];
	while (frontier.length > 0) {
		const at = frontier.pop();
		if (at === undefined || reached.has(at)) {
			continue;
		}
		reached.add(at);
		for (const wire of onward.get(at) ?? []) {
			frontier.push(wire.to);
		}
	}
	return reached;
};
