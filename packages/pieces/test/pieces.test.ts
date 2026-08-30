import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { persistenceIt } from "@antumbra/persistence/testing";
import { Pieces, PiecesLive, verifyPieceExists } from "@antumbra/pieces";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option, PubSub } from "effect";

const it = persistenceIt();
const layer = PiecesLive.pipe(Layer.provideMerge(DomainFeedsLive));

const voyage = {
	captainBackend: "scripted",
	context: "the reef is uncharted",
	crewBackend: "scripted",
	focusedAt: null,
	id: "voyage-1",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

it.effectDB("verifies existence without exposing a row", function* (db) {
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
		expect(yield* verifyPieceExists(piece.id)).toBeUndefined();
		const failure = yield* Effect.flip(pieces.verifyExists("missing-piece"));
		expect(failure).toMatchObject({
			_tag: "PieceNotFound",
			pieceId: "missing-piece",
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("answers voyage membership without exposing rows", function* (db) {
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
	}).pipe(Effect.provide(layer));
});

it.effectDB("owns piece transactions and publishes only committed changes", function* (db) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const pieces = yield* Pieces;
			const notices = yield* feeds.subscribeVoyageRefresh();
			yield* db.Voyage.create(voyage);

			const piece = yield* pieces.charter({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "the soundings are landed",
				role: "hand",
				title: "Sound",
				voyageId: voyage.id,
			});
			expect(yield* PubSub.take(notices)).toBeUndefined();

			yield* pieces.launch(piece.id);
			expect(yield* PubSub.take(notices)).toBeUndefined();
			yield* pieces.launch(piece.id);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
			expect(Option.getOrThrow(yield* db.Piece.where({ id: piece.id }).first()).launchedAt).toBeInstanceOf(Date);
		}),
	).pipe(Effect.provide(layer));
});

it.effectDB("refuses an invalid charter without rows or a notification", function* (db) {
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
			expect(yield* db.Piece.all()).toEqual([]);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
		}),
	).pipe(Effect.provide(layer));
});
