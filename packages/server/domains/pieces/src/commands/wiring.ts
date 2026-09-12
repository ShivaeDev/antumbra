import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { Effect } from "effect";
import { PieceId } from "#ids.ts";
import { pieceEdge } from "#rows/piece-edge.ts";
import { piece } from "#rows/piece.ts";

type Reading = ReadHandles<readonly [typeof piece, typeof pieceEdge]>;

interface Wire {
	readonly from: PieceId;
	readonly to: PieceId;
}

export const DEPENDS_ON = "dependsOn";

export const WOULD_CYCLE = "A piece cannot wait on work that waits on it";

const downstreamOf = (wires: readonly Wire[], id: PieceId): ReadonlySet<PieceId> => {
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

export const wiring = Effect.fnUntraced(function* (rows: Reading, id: PieceId, dependsOn: readonly string[]) {
	const downstream = downstreamOf(yield* rows.pieceEdge.where({}), id);
	const wanted: PieceId[] = [];
	for (const named of dependsOn) {
		const dependency = PieceId.make(named);
		if (wanted.includes(dependency)) {
			continue;
		}
		if (!(yield* rows.piece.exists(dependency))) {
			return { _tag: "Unknown", pieceId: dependency } as const;
		}
		if (downstream.has(dependency)) {
			return { _tag: "Cycle", from: dependency, to: id } as const;
		}
		wanted.push(dependency);
	}
	return { _tag: "Wired", dependsOn: wanted } as const;
});
