import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { PieceVerdict } from "@antumbra/vocabulary/verdict.ts";
import { Effect, Option } from "effect";
import { verifyPieceExists } from "#rows.ts";

const writeVerdict = (pieceId: string, verdict: PieceVerdict) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* verifyPieceExists(pieceId);
		const standing = yield* db.PieceVerdict.where({ pieceId }).first();
		if (Option.isNone(standing)) {
			return yield* db.PieceVerdict.create({ pieceId, verdict }).pipe(Effect.as(true));
		}
		if (standing.value.verdict === verdict) {
			return false;
		}
		yield* db.PieceVerdict.where({ pieceId }).update({ verdict });
		return true;
	});

export const landVerdict = Effect.fn("Pieces.landVerdict")(function* (pieceId: string, verdict: PieceVerdict) {
	const feeds = yield* DomainFeeds;
	const changed = yield* writeVerdict(pieceId, verdict);
	if (changed) {
		yield* feeds.publishVoyageRefresh();
	}
});
