import { boardEntry } from "@antumbra/domain-boards/rows/board-entry.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { type BoardId, ownerOf } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const BODY = "body";

export const SPAN = "coversTo";

export const NEEDS_BODY = "An entry needs a body";

export const SUMMARY_NEEDS_BODY = "A summary needs a body";

export const SUMMARY_NEEDS_SPAN = "A summary needs a span";

export const owned = [boardEntry, piece, voyage] as const;

export const nextSequence = Effect.fn("Boards.nextSequence")(function* (board: BoardId) {
	const rows = yield* Records;
	return (yield* rows.boardEntry.count({ where: { board } }).pipe(Effect.orDie)) + 1;
});

export const standing = Effect.fnUntraced(function* (board: BoardId) {
	const rows = yield* Records;

	const owner = ownerOf(board);
	if (owner === undefined) {
		return false;
	}
	if (owner.kind === "voyage") {
		return yield* rows.voyage.count({ where: { id: owner.voyageId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		);
	}
	return owner.kind === "piece"
		? yield* rows.piece.count({ where: { id: owner.pieceId } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		: true;
});
