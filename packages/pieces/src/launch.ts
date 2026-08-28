import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import { PieceNotFound } from "#errors.ts";

const loadPiece = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* db.Piece.where({ id: pieceId }).first();
		return Option.isNone(row)
			? yield* new PieceNotFound({ pieceId })
			: row.value;
	});

export const launch = (pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		// why: launch is a release moment, not a toggle. A retry observes the
		// existing stamp and must neither re-date nor re-notify the piece.
		const launched = yield* Effect.gen(function* () {
			const piece = yield* loadPiece(pieceId);
			if (piece.launchedAt !== null) {
				return false;
			}
			const now = yield* Clock.currentTimeMillis;
			const updated = yield* db.Piece.where({
				id: pieceId,
				launchedAt: null,
			}).update({
				launchedAt: new Date(now),
			});
			return updated !== null;
		});
		if (launched) {
			yield* feeds.publishVoyageRefresh();
		}
	});
