import { DomainFeeds } from "@antumbra/domain-feeds";
import { Pieces, PiecesLive } from "@antumbra/pieces";
import { it } from "@antumbra/testing-runtime/domain";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";

const voyage = {
	captainBackend: "scripted",
	context: "the reef is uncharted",
	crewBackend: "scripted",
	focusedAt: null,
	id: "voyage-1",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

it.effectApp("verifies existence without exposing a row", function* ({ db }) {
	yield* Effect.gen(function* () {
		const pieces = yield* Pieces;
		const piece = {
			charter: "sound the shallows",
			expectation: "the soundings are landed",
			id: "piece-soundings",
			launchedAt: null,
			parkedAt: null,
			role: "hand",
			title: "Sound",
		};
		yield* db.Piece.create(piece);

		expect(yield* pieces.verifyExists(piece.id)).toBeUndefined();
		const failure = yield* Effect.flip(pieces.verifyExists("missing-piece"));
		expect(failure).toMatchObject({
			_tag: "PieceNotFound",
			pieceId: "missing-piece",
		});
	}).pipe(Effect.provide(PiecesLive));
});

it.effectApp("answers voyage membership without exposing rows", function* ({ db }) {
	yield* Effect.gen(function* () {
		const pieces = yield* Pieces;
		const member = {
			charter: "sound the shallows",
			expectation: "the soundings are landed",
			id: "piece-member",
			launchedAt: null,
			parkedAt: null,
			role: "hand",
			title: "Sound",
		};
		yield* db.Voyage.create(voyage);
		yield* db.Piece.create(member);
		yield* db.VoyagePiece.create({
			pieceId: member.id,
			voyageId: voyage.id,
		});

		expect(yield* pieces.membersOfVoyage(voyage.id)).toEqual(new Set([member.id]));
		expect(yield* pieces.membersOfVoyage("missing-voyage")).toEqual(new Set());
	}).pipe(Effect.provide(PiecesLive));
});

it.effectApp("publishes after successful piece changes", function* ({ db }) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const pieces = yield* Pieces;
			const notices = yield* feeds.subscribeVoyageRefresh();
			const refreshVoyage = { ...voyage, id: "voyage-refresh" };
			yield* db.Voyage.create(refreshVoyage);

			const piece = yield* pieces.charter({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "the soundings are landed",
				role: "hand",
				title: "Sound",
				voyageId: refreshVoyage.id,
			});
			expect(yield* PubSub.take(notices)).toBeUndefined();

			yield* pieces.launch(piece.id);
			expect(yield* PubSub.take(notices)).toBeUndefined();
			yield* pieces.launch(piece.id);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
			expect(Option.getOrThrow(yield* db.Piece.where({ id: piece.id }).first()).launchedAt).toBeInstanceOf(Date);
		}),
	).pipe(Effect.provide(PiecesLive));
});

it.effectApp("refuses an invalid charter without rows or a notification", function* ({ db }) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const pieces = yield* Pieces;
			const notices = yield* feeds.subscribeVoyageRefresh();
			const failure = yield* Effect.flip(
				pieces.charter({
					charter: "sail nowhere",
					dependsOn: [],
					expectation: "nothing",
					role: "hand",
					title: "Adrift",
					voyageId: "missing",
				}),
			);

			expect(failure).toMatchObject({
				_tag: "VoyageNotFound",
				voyageId: "missing",
			});
			expect(yield* db.Piece.where({ title: "Adrift" }).all()).toEqual([]);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
		}),
	).pipe(Effect.provide(PiecesLive));
});
