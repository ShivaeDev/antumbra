import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { dismissedChangeIdsFor } from "#change-verdicts.ts";

export const forPieces = Effect.fn("Changes.forPieces")(function* (pieceIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const pieceChanges = yield* Effect.forEach(yield* db.PieceChange.where((link) => link.pieceId.in(pieceIds)).all(), pieceChangeRow);
	const changeIds = pieceChanges.map((link) => link.changeId);
	const changes = yield* Effect.forEach(
		yield* db.Change.where((change) => change.id.in(changeIds))
			.orderBy((change) => change.createdAt.asc())
			.all(),
		changeRow,
	);
	return { changes, pieceChanges, dismissedChangeIds: yield* dismissedChangeIdsFor(changeIds) };
});
