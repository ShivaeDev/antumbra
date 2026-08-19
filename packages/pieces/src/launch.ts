import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError, Writer } from "@antumbra/persistence";
import { Clock, Effect, Option, PubSub } from "effect";
import { PieceNotFound } from "#errors.ts";
import type { PiecesReturn } from "#requirements.ts";

const loadPiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* db.Piece.where({ id: pieceId }).first();
		return Option.isNone(row)
			? yield* new PieceNotFound({ pieceId })
			: row.value;
	});

export const launch = Effect.fn("pieces.launch")(function* (
	pieceId: string,
): PiecesReturn<void, PieceNotFound | PrismaError> {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const writer = yield* Writer;
	// why: launch is a release moment, not a toggle. A retry observes the
	// existing stamp and must neither re-date nor re-notify the piece.
	const launched = yield* writer.write(
		Effect.gen(function* (): PiecesReturn<
			boolean,
			PieceNotFound | PrismaError
		> {
			const piece = yield* loadPiece(pieceId);
			if (piece.launchedAt !== null) {
				return false;
			}
			const now = yield* Clock.currentTimeMillis;
			yield* db.Piece.where({ id: pieceId }).update({
				launchedAt: new Date(now),
			});
			return true;
		}),
	);
	if (launched) {
		yield* PubSub.publish(feeds.voyages, undefined);
	}
});
