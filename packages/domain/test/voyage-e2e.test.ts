import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	dispatchingLayer,
	makeScriptedBackend,
	type ScriptedBackend,
	type ScriptedSession,
	sessionFor,
} from "#test/harness.ts";
import {
	assignedPieces,
	eventually,
	openReefVoyage,
	PATIENCE,
} from "#test/voyage-fixtures.ts";

const chartered = (
	captain: ScriptedSession,
	title: string,
	dependsOn: ReadonlyArray<string>,
) =>
	Effect.gen(function* () {
		const outcome = yield* callTool(captain, "charter_piece", {
			charter: `do ${title}`,
			dependsOn,
			expectation: `${title} is landed`,
			role: "hand",
			title,
		});
		expect(outcome.ok).toBe(true);
		return outcome.text.replace("chartered ", "");
	});

const launched = (captain: ScriptedSession, pieceId: string) =>
	Effect.gen(function* () {
		expect(yield* callTool(captain, "launch_piece", { pieceId })).toEqual({
			ok: true,
			text: "launched into the pool",
		});
	});

const crewOn = (scripted: ScriptedBackend, pieceId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = (yield* db.PieceAgent.where({ pieceId }).all())[0];
		return row === undefined
			? yield* Effect.fail("no crew yet")
			: yield* sessionFor(scripted, row.agentId);
	});

const landsAndStandsDown = (crew: ScriptedSession, title: string) =>
	Effect.gen(function* () {
		expect(
			yield* callTool(crew, "land_report", {
				body: `${title} is charted`,
				title,
			}),
		).toEqual({ ok: true, text: "report landed" });
		expect(yield* callTool(crew, "stand_down", undefined)).toEqual({
			ok: true,
			text: "standing down",
		});
	});

const voyageStateIs = (voyageId: string, state: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const view = Option.getOrThrow(yield* domain.voyages.read(voyageId));
		expect(view.state).toBe(state);
		return view;
	});

// why: the whole page, with a scripted backend and no model tokens — a voyage
// is hailed a captain, the captain charters and launches, the dispatcher
// spawns what the edges allow, crew land and stand down, and the voyage falls
// quiet on its own.
it.live("a hailed captain charters a chain that sails itself", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const hailed = yield* domain.voyages.hail(voyage.id);
			const captain = yield* eventually(sessionFor(scripted, hailed.agentId));

			const alpha = yield* chartered(captain, "alpha", []);
			const bravo = yield* chartered(captain, "bravo", [alpha]);
			const charlie = yield* chartered(captain, "charlie", [alpha]);
			yield* launched(captain, alpha);
			yield* launched(captain, bravo);
			yield* launched(captain, charlie);

			yield* eventually(
				Effect.gen(function* () {
					expect(yield* assignedPieces).toEqual([alpha]);
				}),
			);
			yield* Effect.sleep(200);
			expect(yield* assignedPieces).toEqual([alpha]);

			yield* landsAndStandsDown(
				yield* eventually(crewOn(scripted, alpha)),
				"soundings",
			);

			yield* eventually(
				Effect.gen(function* () {
					expect((yield* assignedPieces).length).toBe(3);
				}),
			);
			yield* landsAndStandsDown(
				yield* eventually(crewOn(scripted, bravo)),
				"eastern chart",
			);
			yield* landsAndStandsDown(
				yield* eventually(crewOn(scripted, charlie)),
				"western chart",
			);

			const read = yield* callTool(captain, "read_voyage", {});
			expect(read.text).toContain(`- ${alpha} alpha [done]`);
			expect(read.text).toContain(
				`- ${bravo} bravo [done] depends on ${alpha}`,
			);
			expect(read.text).toContain(
				`- ${charlie} charlie [done] depends on ${alpha}`,
			);
			expect(read.text).toContain("soundings — report by");
			expect(read.text).toContain("eastern chart — report by");
			expect(read.text).toContain("western chart — report by");
			expect(read.text).toContain(`- ${hailed.agentId} [alive]`);

			yield* voyageStateIs(voyage.id, "underWay");
			expect(yield* callTool(captain, "stand_down", undefined)).toEqual({
				ok: true,
				text: "standing down",
			});
			yield* eventually(
				Effect.gen(function* () {
					const view = yield* voyageStateIs(voyage.id, "quiet");
					expect(view.pieces.map((piece) => piece.state)).toEqual([
						"done",
						"done",
						"done",
					]);
				}),
			);
		}).pipe(
			Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)),
		);
	}),
);
