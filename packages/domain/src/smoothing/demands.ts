import { Changes } from "@antumbra/changes";
import { defineIntentDemand } from "@antumbra/intent-demand";
import type { IntentKind } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Clock, Effect } from "effect";
import { piecesAttempted, voyagesPassedSince } from "#smoothing/attempts.ts";
import type { SmoothFields, SmoothPieceFields } from "#smoothing/fields.ts";
import { concludedPiecesOf, makeSpannedPieces } from "#smoothing/pieces.ts";

const dayStartMillis = (now: number): number => {
	const at = new Date(now);
	return new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();
};

const voyageIds = Effect.fnUntraced(function* () {
	const db = yield* Database;
	const voyages = yield* db.Voyage.select("id").all();
	return voyages.map((voyage) => voyage.id);
});

const dueVoyages = Effect.fnUntraced(function* () {
	const passed = yield* voyagesPassedSince(dayStartMillis(yield* Clock.currentTimeMillis));
	const voyages = yield* voyageIds();
	return voyages.flatMap((voyageId) => (passed.has(voyageId) ? [] : [{ throughToday: false, voyageId } satisfies SmoothFields]));
});

export const compileSmoothingDemands = (smooth: IntentKind<SmoothFields>, smoothPiece: IntentKind<SmoothPieceFields>) =>
	Effect.gen(function* () {
		const changes = yield* Changes;
		const db = yield* Database;
		const pieces = yield* Pieces;
		const spannedPieces = yield* makeSpannedPieces;
		const settledPieces = Effect.gen(function* () {
			const attempted = yield* piecesAttempted();
			const concluded = yield* concludedPiecesOf(yield* voyageIds());
			const spanned = yield* spannedPieces(concluded.filter((piece) => !attempted.has(piece.pieceId)));
			return spanned.map((piece) => ({ pieceId: piece.pieceId, voyageId: piece.voyageId }) satisfies SmoothPieceFields);
		});
		return [
			defineIntentDemand({ eligible: dueVoyages().pipe(Effect.provideService(Database, db)), identify: ({ voyageId }) => voyageId, kind: smooth }),
			defineIntentDemand({
				eligible: settledPieces.pipe(
					Effect.provideService(Changes, changes),
					Effect.provideService(Database, db),
					Effect.provideService(Pieces, pieces),
				),
				identify: ({ pieceId }) => pieceId,
				kind: smoothPiece,
			}),
		];
	});
