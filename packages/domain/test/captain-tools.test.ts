import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	domainKernelLayer,
	makeScriptedBackend,
	type ScriptedBackend,
	type ScriptedSession,
	sessionFor,
} from "#test/harness.ts";
import { eventually, openReefVoyage } from "#test/voyage-fixtures.ts";

const hailedCaptain = (scripted: ScriptedBackend, voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const hailed = yield* domain.voyages.hail(voyageId);
		return yield* eventually(sessionFor(scripted, hailed.agentId));
	});

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

const pieceOnAnotherVoyage = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const shoals = yield* domain.voyages.open({
		backend: "scripted",
		context: "the shoals are unnamed",
		name: "Name the shoals",
		northStar: "every shoal has a name",
	});
	return yield* domain.voyages.charterPiece({
		charter: "name the northern shoal",
		dependsOn: [],
		expectation: "the shoal is named",
		role: "hand",
		title: "northern",
		voyageId: shoals.id,
	});
});

const withCaptain = <A, E>(
	body: (captain: ScriptedSession) => Effect.Effect<A, E, AgentDomain>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const voyage = yield* openReefVoyage;
			const captain = yield* hailedCaptain(scripted, voyage.id);
			yield* body(captain);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

it.live("a captain charters a piece and positions it in the pool", () =>
	withCaptain((captain) =>
		Effect.gen(function* () {
			const alpha = yield* chartered(captain, "alpha", []);
			expect(
				yield* callTool(captain, "launch_piece", { pieceId: alpha }),
			).toEqual({ ok: true, text: "launched into the pool" });
			expect(
				yield* callTool(captain, "park_piece", { pieceId: alpha }),
			).toEqual({
				ok: true,
				text: "parked",
			});
			expect(
				yield* callTool(captain, "unpark_piece", { pieceId: alpha }),
			).toEqual({ ok: true, text: "unparked" });

			const bravo = yield* chartered(captain, "bravo", [alpha]);
			expect(
				yield* callTool(captain, "rewire_piece", {
					dependsOn: [],
					pieceId: bravo,
				}),
			).toEqual({ ok: true, text: "rewired" });

			const read = yield* callTool(captain, "read_voyage", {});
			expect(read.text).toContain(`- ${alpha} alpha [ready]`);
			expect(read.text).toContain(`- ${bravo} bravo [held]`);
			expect(read.text).toContain("## Landed\n- none");
		}),
	),
);

it.live("a piece that would close a loop is refused, not written", () =>
	withCaptain((captain) =>
		Effect.gen(function* () {
			const alpha = yield* chartered(captain, "alpha", []);
			const bravo = yield* chartered(captain, "bravo", [alpha]);
			const refusal = yield* callTool(captain, "rewire_piece", {
				dependsOn: [bravo],
				pieceId: alpha,
			});
			expect(refusal.ok).toBe(false);
			expect(refusal.text).toContain("rewire_piece");
		}),
	),
);

it.live("chartering onto another voyage's piece is refused, not written", () =>
	withCaptain((captain) =>
		Effect.gen(function* () {
			const elsewhere = yield* pieceOnAnotherVoyage;
			const refusal = yield* callTool(captain, "charter_piece", {
				charter: "do bravo",
				dependsOn: [elsewhere.id],
				expectation: "bravo is landed",
				role: "hand",
				title: "bravo",
			});
			expect(refusal).toEqual({
				ok: false,
				text: `these pieces are not on your voyage: ${elsewhere.id}`,
			});
			expect((yield* callTool(captain, "read_voyage", {})).text).toContain(
				"## Pieces\n- none",
			);
		}),
	),
);

it.live("rewiring onto another voyage's piece is refused, not written", () =>
	withCaptain((captain) =>
		Effect.gen(function* () {
			const alpha = yield* chartered(captain, "alpha", []);
			const elsewhere = yield* pieceOnAnotherVoyage;
			expect(
				yield* callTool(captain, "rewire_piece", {
					dependsOn: [elsewhere.id],
					pieceId: alpha,
				}),
			).toEqual({
				ok: false,
				text: `these pieces are not on your voyage: ${elsewhere.id}`,
			});
			expect((yield* callTool(captain, "read_voyage", {})).text).not.toContain(
				elsewhere.id,
			);
		}),
	),
);

it.live("a captain cons one ship and cannot reach across a hull", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const reef = yield* openReefVoyage;
			const elsewhere = yield* pieceOnAnotherVoyage;
			const captain = yield* hailedCaptain(scripted, reef.id);

			expect(
				yield* callTool(captain, "launch_piece", { pieceId: elsewhere.id }),
			).toEqual({ ok: false, text: "that piece is not on your voyage" });
			expect(
				yield* callTool(captain, "read_board", { scope: "piece" }),
			).toEqual({ ok: false, text: "you have no piece board" });

			expect(
				yield* callTool(captain, "write_board", {
					body: "hand the next captain the eastern approach",
					register: "smooth",
					scope: "voyage",
				}),
			).toEqual({ ok: true, text: "written to the voyage board" });
			expect(
				yield* domain.boards.read({ kind: "voyage", voyageId: reef.id }),
			).toMatchObject([{ body: "hand the next captain the eastern approach" }]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
