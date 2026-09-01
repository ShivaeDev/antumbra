import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { makeSightSessionEvents } from "#sight-session-events.ts";
import { dispatchingLayer, domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, callTool, makeScriptedBackend, rawOf, sessionFor } from "#test/harness.ts";
import { hail, reportsNativeRef } from "#test/session-recovery-fixture.ts";
import { eventually, openReefVoyage, PATIENCE } from "#test/voyage-fixtures.ts";

const firstAssignment = Effect.gen(function* () {
	const db = yield* Database;
	const row = (yield* db.PieceAgent.all())[0];
	return row === undefined ? yield* Effect.fail("no crew yet") : row;
});

it.live("a Piece role named captain remains crew across Session recovery", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const selected = yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const sight = yield* makeSightSessionEvents;
			const voyage = yield* openReefVoyage;
			const piece = yield* domain.voyages.charterPiece({
				charter: "lead the sounding party",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "captain",
				title: "sound the reef",
				voyageId: voyage.id,
			});
			yield* domain.voyages.launch(piece.id);
			const assignment = yield* eventually(firstAssignment);
			const live = yield* eventually(sessionFor(scripted, assignment.agentId));

			expect(yield* db.VoyageAgent.where({ agentId: assignment.agentId }).all()).toEqual([
				{
					agentId: assignment.agentId,
					role: "captain",
					voyageId: voyage.id,
				},
			]);
			expect(live.tools.map((tool) => tool.name)).toContain("land_report");
			expect(live.tools.map((tool) => tool.name)).not.toContain("charter_piece");
			expect(Option.getOrThrow(yield* domain.voyages.read(voyage.id)).captain).toEqual(Option.none());
			expect(
				yield* callTool(live, "land_report", {
					body: "the reef is sounded",
					title: "soundings",
				}),
			).toEqual({ ok: true, text: "report landed" });

			const session = Option.getOrThrow(
				Option.fromUndefinedOr(
					(yield* db.AgentSession.where({
						agentId: assignment.agentId,
					}).all())[0],
				),
			);
			const opened = yield* sight.sessionEventFeed({ fromSeq: 0, sessionId: session.id }).pipe(Stream.take(1), Stream.runCollect, Effect.forkChild);
			yield* live.emit({
				nativeRef: "native-piece-captain-role",
				raw: rawOf("session/opened"),
				type: "session.opened",
			});
			yield* Fiber.join(opened);
			const stored = Option.getOrThrow(yield* db.AgentSession.where({ id: session.id }).first());
			expect(stored.nativeRef).toBe("native-piece-captain-role");
			return {
				agentId: assignment.agentId,
				sessionId: session.id,
				voyageId: voyage.id,
			};
		}).pipe(Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)));

		const resumedBackend = reportsNativeRef(scripted.backend, scripted, "native-piece-captain-role");
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			yield* hail(selected.sessionId);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* scripted.opened).toHaveLength(2);
				}),
			);
			const resumed = yield* sessionFor(scripted, selected.agentId);
			expect(resumed.tools.map((tool) => tool.name)).toContain("land_report");
			expect(resumed.tools.map((tool) => tool.name)).not.toContain("charter_piece");
			expect(Option.getOrThrow(yield* domain.voyages.read(selected.voyageId)).captain).toEqual(Option.none());
		}).pipe(Effect.provide(domainKernelLayer(temporary, resumedBackend)));
	}),
);
