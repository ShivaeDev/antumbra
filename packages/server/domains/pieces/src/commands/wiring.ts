import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { downstreamOf } from "@antumbra/platform-vocabulary/piece-wiring.ts";
import { Effect } from "effect";
import { PieceId } from "#ids.ts";
import type { piece } from "#rows/piece.ts";
import type { pieceEdge } from "#rows/piece-edge.ts";

type Reading = ReadHandles<readonly [typeof piece, typeof pieceEdge]>;

export const DEPENDS_ON = "dependsOn";
export const WOULD_CYCLE = "A piece cannot wait on work that waits on it";

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
