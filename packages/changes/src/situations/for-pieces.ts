import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { situationsOf } from "#situations/of-change.ts";

export const situationsForPieces = Effect.fn("Changes.situationsForPieces")(function* (pieceIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const links = yield* db.PieceChange.where({ purpose: "produces" })
		.where((link) => link.pieceId.in(pieceIds))
		.all();
	const changes = yield* Effect.forEach(yield* db.Change.where((change) => change.id.in(links.map((link) => link.changeId))).all(), changeRow);
	const situations = new Map(changes.map((change) => [change.id, situationsOf(change)]));
	const byPiece = Map.groupBy(links, (link) => link.pieceId);
	return new Map(pieceIds.map((pieceId) => [pieceId, (byPiece.get(pieceId) ?? []).flatMap((link) => situations.get(link.changeId) ?? [])]));
});
