import { RulingSource } from "@antumbra/contract";
import { it } from "@antumbra/persistence/testing";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Fiber, Option } from "effect";
import { asked, layer, oneStanding, pieceId, requesterId, seedFleet, voyageId, watchUntil } from "#test/ruling-source-harness.ts";

it.effectDB("a supersession drops the older ruling from the standing feed", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const older = yield* rulings.request(asked);
		const newer = yield* rulings.request(asked);
		yield* source.rule({ answer: "trust the chart", rulingId: older.id });
		yield* source.rule({
			answer: "the soundings are fresher; plot against them",
			choiceId: newer.choices[0]?.id,
			rulingId: newer.id,
		});
		const watcher = yield* watchUntil(source.standingFeed, oneStanding);

		const receipt = yield* source.supersede({
			byRulingId: newer.id,
			rulingId: older.id,
		});

		expect(receipt).toEqual({ byRulingId: newer.id, rulingId: older.id });
		const seen = yield* Fiber.join(watcher);
		expect(seen[0]?.rulings).toEqual([
			{
				answer: "the soundings are fresher; plot against them",
				chosen: "trust the soundings",
				id: newer.id,
				question: asked.question,
				radius: "voyage",
				ruledAt: expect.any(String),
				ruledBy: "admiral",
				ruledByAgent: null,
				stale: false,
				subjects: expect.arrayContaining([
					{ id: voyageId, kind: "voyage", label: "Chart the reef" },
					{ id: "surveying", kind: "tag", label: "surveying" },
				]),
				urgency: "blocking",
			},
		]);
		const superseded = yield* rulings.get(older.id);
		expect(Option.getOrUndefined(superseded.supersession)).toMatchObject({
			by: "admiral",
			byRulingId: newer.id,
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a supersession the record refuses, in its words", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const standing = yield* rulings.request(asked);
		const open = yield* rulings.request(asked);
		yield* source.rule({ answer: "trust the chart", rulingId: standing.id });

		const unruled = yield* Effect.flip(source.supersede({ byRulingId: open.id, rulingId: standing.id }));
		const itself = yield* Effect.flip(source.supersede({ byRulingId: standing.id, rulingId: standing.id }));
		const adrift = yield* Effect.flip(
			source.supersede({
				byRulingId: standing.id,
				rulingId: "ruling-adrift",
			}),
		);

		expect(unruled).toMatchObject({
			_tag: "RulingRefused",
			reason: `ruling ${open.id} has not been ruled`,
		});
		expect(itself).toMatchObject({
			_tag: "RulingRefused",
			reason: `ruling ${standing.id} cannot supersede itself`,
		});
		expect(adrift).toMatchObject({
			_tag: "RulingRefused",
			reason: "no ruling: ruling-adrift",
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("standing rulings stay fresh during work and conclude after abandonment", function* (db) {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const source = yield* RulingSource;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request({ ...asked, subjects: [{ kind: "piece", id: pieceId }] });
		yield* source.rule({ answer: "survey first", rulingId: requested.id });
		yield* db.PieceVerdict.create({ pieceId, verdict: "delivered" });
		yield* db.PieceAgent.create({ pieceId, agentId: requesterId });
		yield* db.AgentSession.create({
			id: "root",
			agentId: requesterId,
			rootSessionId: "root",
			cwd: "/tmp",
			status: "open",
			executionStatus: "active",
		});
		expect((yield* source.standing).rulings[0]?.stale).toBe(false);
		yield* db.AgentSession.where({ id: "root" }).update({ executionStatus: "idle" });
		expect((yield* source.standing).rulings[0]?.stale).toBe(true);
		yield* db.AgentSession.where({ id: "root" }).update({ executionStatus: "active" });
		yield* db.PieceVerdict.where({ pieceId }).update({ verdict: "abandoned" });
		expect((yield* source.standing).rulings[0]?.stale).toBe(true);
	}).pipe(Effect.provide(layer));
});

it.effectDB("a standing voyage ruling concludes only after all its pieces", function* (db) {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const source = yield* RulingSource;
		const rulings = yield* Rulings;
		const requested = yield* rulings.request({ ...asked, subjects: [{ kind: "voyage", id: voyageId }] });
		yield* source.rule({ answer: "survey first", rulingId: requested.id });
		yield* db.Piece.create({ id: "second", title: "Second", charter: "second", expectation: "second", role: "hand" });
		yield* db.VoyagePiece.create({ pieceId: "second", voyageId });
		yield* db.PieceVerdict.create({ pieceId, verdict: "delivered" });
		expect((yield* source.standing).rulings[0]?.stale).toBe(false);
		yield* db.PieceVerdict.create({ pieceId: "second", verdict: "delivered" });
		expect((yield* source.standing).rulings[0]?.stale).toBe(true);
	}).pipe(Effect.provide(layer));
});
