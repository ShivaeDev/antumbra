import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { Effect } from "effect";
import { type BoardId, ownerOf } from "#ids.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const BODY = "body";

export const SPAN = "coversTo";

export const NEEDS_BODY = "An entry needs a body";

export const SUMMARY_NEEDS_BODY = "A summary needs a body";

export const SUMMARY_NEEDS_SPAN = "A summary needs a span";

export const owned = [boardEntry, piece, voyage] as const;

type Owned = ReadHandles<typeof owned>;

type Counted = Pick<ReadHandles<readonly [typeof boardEntry]>, "boardEntry">;

export const nextSequence = (rows: Counted, board: BoardId): Effect.Effect<number> =>
	Effect.map(rows.boardEntry.count({ board }), (written) => written + 1);

export const standing = Effect.fnUntraced(function* (rows: Owned, board: BoardId) {
	const owner = ownerOf(board);
	if (owner === undefined) {
		return false;
	}
	if (owner.kind === "voyage") {
		return yield* rows.voyage.exists(owner.voyageId);
	}
	return owner.kind === "piece" ? yield* rows.piece.exists(owner.pieceId) : true;
});
