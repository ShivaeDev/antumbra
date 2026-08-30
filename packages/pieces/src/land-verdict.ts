import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import type { PieceVerdict } from "@antumbra/vocabulary/verdict";
import { Effect, Option } from "effect";
import { verifyPieceExists } from "#rows.ts";

const recoverVerdictCreate = (
	pieceId: string,
	verdict: PieceVerdict,
	failure: PrismaError,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const winner = yield* db.PieceVerdict.where({ pieceId }).first();
		if (Option.isNone(winner)) {
			return yield* failure;
		}
		if (winner.value.verdict === verdict) {
			return false;
		}
		yield* db.PieceVerdict.where({ pieceId }).update({ verdict });
		return true;
	});

const writeVerdict = (pieceId: string, verdict: PieceVerdict) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* verifyPieceExists(pieceId);
		const standing = yield* db.PieceVerdict.where({ pieceId }).first();
		if (Option.isNone(standing)) {
			return yield* db.PieceVerdict.create({ pieceId, verdict }).pipe(
				Effect.as(true),
				Effect.catchTag("PrismaError", (failure) =>
					recoverVerdictCreate(pieceId, verdict, failure),
				),
			);
		}
		if (standing.value.verdict === verdict) {
			return false;
		}
		yield* db.PieceVerdict.where({ pieceId }).update({ verdict });
		return true;
	});

// why: the verdict is a landed outcome like a report or an artifact, never a
// column saying the piece is done — the tally counts it and the ladder still
// decides what the piece reads as. A piece holds one verdict at a time, so a
// corrected word replaces the standing one rather than stacking beside it.
export const landVerdict = Effect.fn("pieces.landVerdict")(function* (
	pieceId: string,
	verdict: PieceVerdict,
) {
	const feeds = yield* DomainFeeds;
	const changed = yield* writeVerdict(pieceId, verdict);
	if (changed) {
		yield* feeds.publishVoyageRefresh();
	}
});
