import { DomainFeeds } from "@antumbra/domain-feeds";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
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
});

it.effectApp("answers voyage membership without exposing rows", function* ({ db }) {
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
});

it.effectApp("publishes after successful piece changes", function* ({ db }) {
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
});

it.effectApp("refuses an invalid charter without rows or a notification", function* ({ db }) {
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
	expect(yield* db.VoyagePiece.all()).toEqual([]);
	expect(yield* db.PieceEdge.all()).toEqual([]);
	expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
});

it.effectApp("a refused charter leaves no partial piece or membership", function* ({ db }) {
	const pieces = yield* Pieces;
	yield* db.Voyage.create(voyage);
	const failure = yield* Effect.flip(
		pieces.charter({
			charter: "do adrift",
			dependsOn: ["missing"],
			expectation: "adrift is landed",
			role: "hand",
			title: "adrift",
			voyageId: voyage.id,
		}),
	);
	expect(failure).toMatchObject({ _tag: "PieceNotFound" });
	expect(yield* db.Piece.all()).toEqual([]);
	expect(yield* db.VoyagePiece.all()).toEqual([]);
	expect(yield* db.PieceEdge.all()).toEqual([]);
});

it.effectApp("a refused rewire preserves the previous dependencies", function* ({ db }) {
	const pieces = yield* Pieces;
	yield* db.Voyage.create(voyage);
	const alpha = yield* pieces.charter({
		charter: "do alpha",
		dependsOn: [],
		expectation: "alpha is landed",
		role: "hand",
		title: "alpha",
		voyageId: voyage.id,
	});
	const beta = yield* pieces.charter({
		charter: "do beta",
		dependsOn: [alpha.id],
		expectation: "beta is landed",
		role: "hand",
		title: "beta",
		voyageId: voyage.id,
	});
	const failure = yield* Effect.flip(pieces.setDependencies(beta.id, [alpha.id, "missing", beta.id]));
	expect(failure).toMatchObject({ _tag: "PieceNotFound", pieceId: "missing" });
	const cycle = yield* Effect.flip(pieces.setDependencies(beta.id, [alpha.id, beta.id, "missing"]));
	expect(cycle).toMatchObject({ _tag: "EdgeWouldCycle", fromPieceId: beta.id, toPieceId: beta.id });
	expect(yield* db.PieceEdge.where({ toPieceId: beta.id }).all()).toMatchObject([{ fromPieceId: alpha.id, toPieceId: beta.id }]);
});
