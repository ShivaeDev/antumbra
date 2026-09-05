import { ChangesLive } from "@antumbra/changes";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { ReposLive } from "@antumbra/repos";
import { Rulings, RulingsLive } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { VoyageWorldSource } from "#voyage-world/service.ts";

const WorldLive = VoyageWorldSource.layer.pipe(
	Layer.provideMerge(
		ChangesLive(new Map(), new Map()).pipe(
			Layer.provideMerge(PiecesLive),
			Layer.provideMerge(ReposLive),
			Layer.provideMerge(RulingsLive),
			Layer.provideMerge(DomainFeedsLive),
		),
	),
);

const piece = (id: string) => ({
	charter: "draw the reef",
	expectation: "a chart lands",
	id,
	launchedAt: null,
	parkedAt: null,
	role: "cartographer",
	title: id,
});

it.effectDB("owns the aggregate read and preserves voyage birth order", function* (db) {
	yield* db.Voyage.create({
		captainBackend: "scripted",
		context: "charted second",
		crewBackend: "scripted",
		createdAt: new Date("2026-08-17T02:00:00.000Z"),
		focusedAt: null,
		id: "newer-voyage",
		name: "Newer",
		northStar: "second",
	});
	yield* db.Voyage.create({
		captainBackend: "scripted",
		context: "charted first",
		crewBackend: "scripted",
		createdAt: new Date("2026-08-17T01:00:00.000Z"),
		focusedAt: null,
		id: "older-voyage",
		name: "Older",
		northStar: "first",
	});

	yield* Effect.gen(function* () {
		const source = yield* VoyageWorldSource;
		const world = yield* source.read();
		expect(world.voyages.map((voyage) => voyage.id)).toEqual(["older-voyage", "newer-voyage"]);
	}).pipe(Effect.provide(WorldLive));
});

it.effectDB("carries each open ruling and names its question on its gate", function* (db) {
	yield* db.Agent.create({
		charter: "ask what the chart cannot answer",
		id: "agent-asker",
		role: "hand",
		status: "dormant",
	});
	yield* db.Piece.create(piece("piece-one"));

	yield* Effect.gen(function* () {
		const rulings = yield* Rulings;
		const asked = yield* rulings.request({
			choices: [],
			context: "the chart and the soundings disagree",
			gates: [],
			question: "which reading do we plot against?",
			radius: "piece",
			requester: { agentId: "agent-asker", kind: "agent" },
			rung: "admiral",
			subjects: [],
			urgency: "pressing",
		});
		yield* rulings.gate({ pieceIds: ["piece-one"], rulingId: asked.id });
		const settled = yield* rulings.request({
			choices: [],
			context: "two charts of the same reef",
			gates: [],
			question: "which chart do we sail by?",
			radius: "piece",
			requester: { agentId: "agent-asker", kind: "agent" },
			rung: "admiral",
			subjects: [],
			urgency: "pressing",
		});
		yield* rulings.rule({ answer: "the newest", by: "admiral", rulingId: settled.id });

		const source = yield* VoyageWorldSource;
		const world = yield* source.read();
		expect(world.openRulings.map((ruling) => ruling.id)).toEqual([asked.id]);
		expect(world.rulingGates).toEqual([
			{
				pieceId: "piece-one",
				question: "which reading do we plot against?",
				rulingId: asked.id,
			},
		]);
	}).pipe(Effect.provide(WorldLive));
});
