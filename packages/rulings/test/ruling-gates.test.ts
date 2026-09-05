import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, PubSub } from "effect";
import { asked, pieceId, seedFleet } from "#test/rulings-harness.ts";

it.effectApp("holds the pieces a request names until it is ruled", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const requested = yield* rulings.request(asked);
			const readiness = yield* feeds.subscribeVoyageRefresh();

			const gated = yield* rulings.gate({
				pieceIds: [pieceId],
				rulingId: requested.id,
			});

			expect(gated.gatedPieceIds).toEqual([pieceId]);
			expect(yield* PubSub.take(readiness)).toBeUndefined();
			expect(yield* rulings.openGates()).toEqual([{ pieceId, question: asked.question, rulingId: requested.id }]);
		}),
	);
});

it.effectApp("leaves a ruled ruling holding nothing", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const requested = yield* rulings.request(asked);
			yield* rulings.gate({ pieceIds: [pieceId], rulingId: requested.id });
			const readiness = yield* feeds.subscribeVoyageRefresh();

			const ruled = yield* rulings.rule({
				answer: "trust the soundings",
				by: "admiral",
				rulingId: requested.id,
			});

			expect(ruled.gatedPieceIds).toEqual([pieceId]);
			expect(yield* PubSub.take(readiness)).toBeUndefined();
			expect(yield* rulings.openGates()).toEqual([]);
		}),
	);
});

it.effectApp("refuses to gate on a ruling that already stands", function* ({ db }) {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const requested = yield* rulings.request(asked);
	yield* rulings.rule({
		answer: "trust the soundings",
		by: "admiral",
		rulingId: requested.id,
	});

	const failure = yield* Effect.flip(rulings.gate({ pieceIds: [pieceId], rulingId: requested.id }));

	expect(failure).toMatchObject({
		_tag: "RulingAlreadyRuled",
		rulingId: requested.id,
	});
	expect(yield* db.RulingGate.all()).toEqual([]);
});

it.effectApp("refuses a gate naming what the fleet lost", function* ({ db }) {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const requested = yield* rulings.request(asked);

	const failure = yield* Effect.flip(
		rulings.gate({
			pieceIds: [pieceId, "piece-adrift"],
			rulingId: requested.id,
		}),
	);

	expect(failure).toMatchObject({
		_tag: "RulingGatePieceMissing",
		pieceId: "piece-adrift",
	});
	expect(yield* db.RulingGate.all()).toEqual([]);
});

it.effectApp("refuses to gate on a ruling nothing asked", function* () {
	const rulings = yield* Rulings;

	expect(yield* Effect.flip(rulings.gate({ pieceIds: [], rulingId: "ruling-missing" }))).toMatchObject({
		_tag: "RulingNotFound",
		rulingId: "ruling-missing",
	});
});

it.effectApp("lands the gates a request names", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const readiness = yield* feeds.subscribeVoyageRefresh();

			const requested = yield* rulings.request({ ...asked, gates: [pieceId] });

			expect(requested.gatedPieceIds).toEqual([pieceId]);
			expect(yield* PubSub.take(readiness)).toBeUndefined();
			expect(yield* rulings.openGates()).toEqual([{ pieceId, question: asked.question, rulingId: requested.id }]);
		}),
	);
});

it.effectApp("refuses a whole request gating what the fleet lost", function* ({ db }) {
	yield* seedFleet;
	const rulings = yield* Rulings;

	const failure = yield* Effect.flip(rulings.request({ ...asked, gates: [pieceId, "piece-adrift"] }));

	expect(failure).toMatchObject({
		_tag: "RulingGatePieceMissing",
		pieceId: "piece-adrift",
	});
	expect(yield* db.Ruling.all()).toEqual([]);
	expect(yield* db.RulingGate.all()).toEqual([]);
});

it.effectApp("tells the voyage of a request only when it holds", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const readiness = yield* feeds.subscribeVoyageRefresh();

			yield* rulings.request(asked);

			expect(yield* PubSub.takeUpTo(readiness, 1)).toEqual([]);
		}),
	);
});
