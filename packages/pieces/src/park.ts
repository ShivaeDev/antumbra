import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError, Writer } from "@antumbra/persistence";
import { Clock, Effect, PubSub } from "effect";
import type { PieceNotFound } from "#errors.ts";
import type { PiecesReturn } from "#requirements.ts";
import { verifyPieceExists } from "#rows.ts";

export const park = Effect.fn("pieces.park")(function* (
	pieceId: string,
	parked: boolean,
): PiecesReturn<void, PieceNotFound | PrismaError> {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const writer = yield* Writer;
	const now = yield* Clock.currentTimeMillis;
	yield* writer.write(
		Effect.gen(function* (): PiecesReturn<void, PieceNotFound | PrismaError> {
			yield* verifyPieceExists(pieceId);
			yield* db.Piece.where({ id: pieceId }).update({
				parkedAt: parked ? new Date(now) : null,
			});
		}),
	);
	yield* PubSub.publish(feeds.voyages, undefined);
});
