import { BoardScope } from "@antumbra/boards";
import { AgentDomain } from "@antumbra/domain";
import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import type { ScriptedBackend, ScriptedSession } from "@antumbra/testing-runtime";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";

const terminalStatus = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow), Effect.orDie);

const callTool = (session: ScriptedSession, name: string, args: unknown) =>
	Option.match(Option.fromUndefinedOr(session.tools.find((tool) => tool.name === name)), {
		onNone: () => Effect.die(`the session has no ${name} tool`),
		onSome: (tool) => tool.call(args),
	});

const sessionOf = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = Option.getOrThrow(yield* db.AgentSession.where({ agentId }).first());
		return Option.getOrThrow(Option.fromUndefinedOr(yield* scripted.session(row.id)));
	});

const hailedCaptain = (scripted: ScriptedBackend, voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const hailed = yield* domain.voyages.hail(voyageId);
		expect(yield* terminalStatus(kernel.changes(hailed.intentId))).toBe("succeeded");
		return yield* sessionOf(scripted, hailed.agentId);
	});

const openReefVoyage = AgentDomain.pipe(
	Effect.flatMap((domain) =>
		domain.voyages.open({
			backend: "scripted",
			context: "the reef is uncharted",
			name: "Chart the reef",
			northStar: "every shoal is known",
		}),
	),
);

const chartered = (captain: ScriptedSession, title: string, dependsOn: ReadonlyArray<string>) =>
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
	const pieces = yield* Pieces;
	const domain = yield* AgentDomain;
	const shoals = yield* domain.voyages.open({
		backend: "scripted",
		context: "the shoals are unnamed",
		name: "Name the shoals",
		northStar: "every shoal has a name",
	});
	const piece = yield* pieces.charter({
		charter: "name the northern shoal",
		dependsOn: [],
		expectation: "the shoal is named",
		role: "hand",
		title: "northern",
		voyageId: shoals.id,
	});
	return { piece, voyageId: shoals.id };
});

const withCaptain = <A, E, R>(scripted: ScriptedBackend, body: (captain: ScriptedSession) => Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const voyage = yield* openReefVoyage;
		const captain = yield* hailedCaptain(scripted, voyage.id);
		yield* body(captain);
	});

it.effectApp("a captain charters a piece and positions it in the pool", { clock: "live" }, function* ({ scripted }) {
	yield* withCaptain(scripted, (captain) =>
		Effect.gen(function* () {
			const alpha = yield* chartered(captain, "alpha", []);
			expect(yield* callTool(captain, "launch_piece", { pieceId: alpha })).toEqual({ ok: true, text: "launched into the pool" });
			expect(yield* callTool(captain, "park_piece", { pieceId: alpha })).toEqual({
				ok: true,
				text: "parked",
			});
			expect(yield* callTool(captain, "unpark_piece", { pieceId: alpha })).toEqual({ ok: true, text: "unparked" });

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
	);
});

it.effectApp("a piece that would close a loop is refused, not written", { clock: "live" }, function* ({ scripted }) {
	yield* withCaptain(scripted, (captain) =>
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
	);
});

it.effectApp("chartering onto another voyage's piece is refused, not written", { clock: "live" }, function* ({ scripted }) {
	yield* withCaptain(scripted, (captain) =>
		Effect.gen(function* () {
			const elsewhere = yield* pieceOnAnotherVoyage;
			const refusal = yield* callTool(captain, "charter_piece", {
				charter: "do bravo",
				dependsOn: [elsewhere.piece.id],
				expectation: "bravo is landed",
				role: "hand",
				title: "bravo",
			});
			expect(refusal).toEqual({
				ok: false,
				text: `these pieces are not on your voyage: ${elsewhere.piece.id}`,
			});
			expect((yield* callTool(captain, "read_voyage", {})).text).toContain("## Pieces\n- none");
		}),
	);
});

it.effectApp("rewiring onto another voyage's piece is refused, not written", { clock: "live" }, function* ({ scripted }) {
	yield* withCaptain(scripted, (captain) =>
		Effect.gen(function* () {
			const alpha = yield* chartered(captain, "alpha", []);
			const elsewhere = yield* pieceOnAnotherVoyage;
			expect(
				yield* callTool(captain, "rewire_piece", {
					dependsOn: [elsewhere.piece.id],
					pieceId: alpha,
				}),
			).toEqual({
				ok: false,
				text: `these pieces are not on your voyage: ${elsewhere.piece.id}`,
			});
			expect((yield* callTool(captain, "read_voyage", {})).text).not.toContain(elsewhere.piece.id);
		}),
	);
});

it.effectApp("a captain may read another voyage without conning it", { clock: "live" }, function* ({ scripted }) {
	yield* Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const reef = yield* openReefVoyage;
		const elsewhere = yield* pieceOnAnotherVoyage;
		const captain = yield* hailedCaptain(scripted, reef.id);

		expect(
			yield* callTool(captain, "launch_piece", {
				pieceId: elsewhere.piece.id,
			}),
		).toEqual({ ok: false, text: "that piece is not on your voyage" });
		expect(
			(yield* callTool(captain, "read_voyage", {
				voyageId: elsewhere.voyageId,
			})).text,
		).toContain("# Name the shoals");
		expect((yield* callTool(captain, "read_voyage", { voyageId: reef.id })).text).toContain("# Chart the reef");
		expect(yield* callTool(captain, "read_board", { scope: "piece" })).toEqual({ ok: false, text: "you have no piece board" });

		expect(
			yield* callTool(captain, "write_board", {
				body: "hand the next captain the eastern approach",
				scope: "voyage",
			}),
		).toEqual({ ok: true, text: "written to the voyage board" });
		expect(yield* domain.boards.read(BoardScope.Voyage({ voyageId: reef.id }))).toMatchObject([
			{ body: "hand the next captain the eastern approach" },
		]);
	});
});
