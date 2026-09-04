import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import { verifyPieceExists } from "#rows.ts";

export const park = Effect.fn("Pieces.park")(function* (pieceId: string, parked: boolean) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	yield* verifyPieceExists(pieceId);
	yield* db.Piece.where({ id: pieceId }).update({
		parkedAt: parked ? new Date(now) : null,
	});
	yield* feeds.publishVoyageRefresh();
});
