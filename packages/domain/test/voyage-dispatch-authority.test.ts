import { BoardScope } from "@antumbra/boards";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Voyages } from "@antumbra/voyages";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { makeSightSessionEvents } from "#sight-session-events.ts";
import { dispatchingLayer, domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, callTool, makeScriptedBackend, rawOf, sessionFor } from "#test/harness.ts";
import { hail, reportsNativeRef } from "#test/session-recovery-fixture.ts";
import { chain, eventually, PATIENCE } from "#test/voyage-fixtures.ts";

const HAND: SpawnFields = {
	agentId: "agent-hand-with-piece",
	backend: "scripted",
	charter: "sound the shallows",
	role: "hand",
	runner: "local",
	sessionId: "session-hand-with-piece",
};

const spawnByHand = (payload: SpawnFields) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		yield* kernel.submit(domain.spawn, payload);
	});

const firstAssignedCrew = Effect.gen(function* () {
	const db = yield* Database;
	const assignment = (yield* db.PieceAgent.all())[0];
	return assignment === undefined ? yield* Effect.fail("no dispatched crew yet") : assignment;
});

it.live("dispatched crew keeps its selected Voyage authority across rebuild", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const selected = yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const voyageRecords = yield* Voyages;
			const sight = yield* makeSightSessionEvents;
			const { alpha, voyage } = yield* chain;
			const decoy = yield* voyageRecords.open({
				backend: "scripted",
				context: "the southern reef is unrelated",
				name: "Chart the southern reef",
				northStar: "every southern shoal is known",
			});
			const assignment = yield* eventually(firstAssignedCrew);
			const live = yield* eventually(sessionFor(scripted, assignment.agentId));
			yield* db.VoyagePiece.create({ pieceId: alpha.id, voyageId: decoy.id });
			expect(new Set((yield* db.VoyagePiece.where({ pieceId: alpha.id }).all()).map((membership) => membership.voyageId))).toEqual(
				new Set([voyage.id, decoy.id]),
			);
			const session = Option.getOrThrow(
				Option.fromUndefinedOr(
					(yield* db.AgentSession.where({
						agentId: assignment.agentId,
					}).all())[0],
				),
			);

			expect(yield* db.VoyageAgent.where({ agentId: assignment.agentId }).all()).toEqual([
				{ agentId: assignment.agentId, role: "hand", voyageId: voyage.id },
			]);
			expect(
				yield* callTool(live, "write_board", {
					body: "the swell is running",
					scope: "voyage",
				}),
			).toEqual({ ok: true, text: "written to the voyage board" });
			expect(yield* domain.boards.read(BoardScope.Voyage({ voyageId: voyage.id }))).toMatchObject([{ body: "the swell is running" }]);
			expect(yield* domain.boards.read(BoardScope.Voyage({ voyageId: decoy.id }))).toEqual([]);

			const opened = yield* sight.sessionEventFeed({ fromSeq: 0, sessionId: session.id }).pipe(Stream.take(1), Stream.runCollect, Effect.forkChild);
			yield* live.emit({
				nativeRef: "native-selected-voyage",
				raw: rawOf("session/opened"),
				type: "session.opened",
			});
			yield* Fiber.join(opened);
			const stored = Option.getOrThrow(yield* db.AgentSession.where({ id: session.id }).first());
			expect(stored.nativeRef).toBe("native-selected-voyage");
			return {
				agentId: assignment.agentId,
				decoyId: decoy.id,
				sessionId: session.id,
				voyageId: voyage.id,
			};
		}).pipe(Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)));

		const resumedBackend = reportsNativeRef(scripted.backend, scripted, "native-selected-voyage");
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			yield* hail(selected.sessionId);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* scripted.opened).toHaveLength(2);
				}),
			);
			const resumed = yield* sessionFor(scripted, selected.agentId);
			expect(yield* db.VoyageAgent.where({ agentId: selected.agentId }).all()).toEqual([
				{
					agentId: selected.agentId,
					role: "hand",
					voyageId: selected.voyageId,
				},
			]);
			expect(
				yield* callTool(resumed, "write_board", {
					body: "the durable authority survived rebuild",
					scope: "voyage",
				}),
			).toEqual({ ok: true, text: "written to the voyage board" });
			expect((yield* domain.boards.read(BoardScope.Voyage({ voyageId: selected.voyageId }))).map((entry) => entry.body)).toEqual([
				"the swell is running",
				"the durable authority survived rebuild",
			]);
			expect(yield* domain.boards.read(BoardScope.Voyage({ voyageId: selected.decoyId }))).toEqual([]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, resumedBackend)));
	}),
);

it.live("Piece membership cannot supply missing Session Voyage authority", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const pieces = yield* Pieces;
			const domain = yield* AgentDomain;
			const voyageRecords = yield* Voyages;
			const voyage = yield* voyageRecords.open({
				backend: "scripted",
				context: "the reef is uncharted",
				name: "Chart the reef",
				northStar: "every shoal is known",
			});
			const piece = yield* pieces.charter({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			yield* spawnByHand({ ...HAND, pieceId: piece.id });
			const live = yield* eventually(sessionFor(scripted, HAND.agentId));
			expect(
				yield* callTool(live, "write_board", {
					body: "this must not be guessed from membership",
					scope: "voyage",
				}),
			).toEqual({ ok: false, text: "you have no voyage board" });
			expect(yield* domain.boards.read(BoardScope.Voyage({ voyageId: voyage.id }))).toEqual([]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
