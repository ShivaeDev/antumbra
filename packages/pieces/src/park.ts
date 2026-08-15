import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { Clock, Effect, PubSub } from "effect";
import { requirePiece } from "#rows.ts";

export const park = (pieceId: string, parked: boolean) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const writer = yield* Writer;
		const now = yield* Clock.currentTimeMillis;
		yield* writer.write(
			Effect.gen(function* () {
				yield* requirePiece(pieceId);
				yield* db.Piece.where({ id: pieceId }).update({
					parkedAt: parked ? new Date(now) : null,
				});
			}),
		);
		yield* PubSub.publish(feeds.voyages, undefined);
	});
