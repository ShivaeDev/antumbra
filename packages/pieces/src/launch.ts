import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import { PieceNotFound } from "#errors.ts";

const loadPiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* db.Piece.where({ id: pieceId }).first();
		return Option.isNone(row) ? yield* new PieceNotFound({ pieceId }) : row.value;
	});

export const launch = Effect.fn("pieces.launch")(function* (pieceId: string) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const piece = yield* loadPiece(pieceId);
	if (piece.launchedAt !== null) {
		return;
	}
	const now = yield* Clock.currentTimeMillis;
	yield* db.Piece.where({ id: pieceId }).update({ launchedAt: new Date(now) });
	yield* feeds.publishVoyageRefresh();
});
