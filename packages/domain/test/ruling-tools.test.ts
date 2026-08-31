import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { DirectTool } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { makeRulingToolCompiler } from "#ruling-tools.ts";
import { dispatchingLayer, domainCapabilityLayer, domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, callTool, makeScriptedBackend, type ScriptedBackend, sessionFor } from "#test/harness.ts";
import { chain, openReefVoyage, PATIENCE } from "#test/voyage-fixtures.ts";

const ASK = {
	choices: [{ detail: "the soundings are fresher", label: "resurvey" }],
	context: "the chart disagrees with what we sounded",
	question: "which reading do we trust?",
	radius: "voyage",
	tags: ["surveying", "charts"],
	urgency: "pressing",
};

const rulingTool = (tools: ReadonlyArray<DirectTool>): DirectTool =>
	Option.getOrThrow(Option.fromUndefinedOr(tools.find((tool) => tool.name === "request_ruling")));

it.live("a request carries who asked and where the asker stood", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const voyage = yield* openReefVoyage;
			const alpha = yield* domain.voyages.charterPiece({
				charter: "do alpha",
				dependsOn: [],
				expectation: "alpha is landed",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			const crewed = yield* domain.voyages.workNow(alpha.id);
			const status = yield* kernel
				.changes(crewed.intentId)
				.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));
			expect(status).toBe("succeeded");
			const live = yield* sessionFor(scripted, crewed.agentId);

			const outcome = yield* callTool(live, "request_ruling", ASK);

			const stored = (yield* db.Ruling.all())[0];
			expect(stored).toMatchObject({
				context: ASK.context,
				question: ASK.question,
				radius: "voyage",
				requesterAgentId: crewed.agentId,
				urgency: "pressing",
			});
			expect(outcome).toEqual({
				ok: true,
				text: `ruling ${stored?.id} requested — voyage radius, pressing. The answer reaches you as mail; nothing here waits for it.`,
			});
			expect((yield* db.RulingSubject.all()).map((row) => [row.kind, row.agentId ?? row.pieceId ?? row.voyageId ?? row.tag])).toEqual([
				["piece", alpha.id],
				["voyage", voyage.id],
				["agent", crewed.agentId],
				["tag", "surveying"],
				["tag", "charts"],
			]);
			expect((yield* db.RulingChoice.all()).map((row) => row.label)).toEqual(["resurvey"]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a ruling asked from a piece the fleet lost is refused, not stored", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* db.Agent.create({
				charter: "sound the shallows",
				id: "agent-adrift",
				role: "hand",
				status: "alive",
			});
			const compile = yield* makeRulingToolCompiler;
			const tools = compile({
				agentId: "agent-adrift",
				pieceId: Option.some("piece-adrift"),
				sessionId: "session-adrift",
				voyageId: Option.none(),
			});

			const outcome = yield* rulingTool(tools).call(ASK);

			expect(outcome).toEqual({
				ok: false,
				text: "request_ruling: RulingSubjectMissing: the fleet has no piece piece-adrift",
			});
			expect(yield* db.Ruling.all()).toEqual([]);
			expect(yield* db.RulingSubject.all()).toEqual([]);
		}).pipe(Effect.provide(domainCapabilityLayer(temporary)));
	}),
);

const gatedPieceIds = Effect.gen(function* () {
	const db = yield* Database;
	return (yield* db.RulingGate.all()).map((row) => row.pieceId);
});

const captainOf = (scripted: ScriptedBackend, voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const hailed = yield* domain.voyages.hail(voyageId);
		const status = yield* kernel
			.changes(hailed.intentId)
			.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));
		expect(status).toBe("succeeded");
		return yield* sessionFor(scripted, hailed.agentId);
	});

it.live("a captain holds pieces of its own voyage until it is ruled", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const { bravo, charlie, voyage } = yield* chain;
			const captain = yield* captainOf(scripted, voyage.id);

			const outcome = yield* callTool(captain, "request_ruling", {
				...ASK,
				gates: [bravo.id, charlie.id],
			});

			const stored = (yield* db.Ruling.all())[0];
			expect(outcome).toEqual({
				ok: true,
				text: `ruling ${stored?.id} requested — voyage radius, pressing; holds 2 piece(s). The answer reaches you as mail; nothing here waits for it.`,
			});
			expect(yield* gatedPieceIds).toEqual([bravo.id, charlie.id]);
		}).pipe(Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)));
	}),
);

it.live("a hold naming another voyage's piece is refused, not stored", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { bravo, voyage } = yield* chain;
			const other = yield* openReefVoyage;
			const foreign = yield* domain.voyages.charterPiece({
				charter: "do delta",
				dependsOn: [],
				expectation: "delta is landed",
				role: "hand",
				title: "delta",
				voyageId: other.id,
			});
			const captain = yield* captainOf(scripted, voyage.id);

			const outcome = yield* callTool(captain, "request_ruling", {
				...ASK,
				gates: [bravo.id, foreign.id],
			});

			expect(outcome).toEqual({
				ok: false,
				text: `these pieces are not on your voyage: ${foreign.id}`,
			});
			expect(yield* db.Ruling.all()).toEqual([]);
			expect(yield* db.RulingGate.all()).toEqual([]);
		}).pipe(Effect.provide(dispatchingLayer(temporary, scripted.backend, PATIENCE)));
	}),
);

it.live("crew on a piece may hold a sibling piece of its voyage", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const voyage = yield* openReefVoyage;
			const charter = (title: string) =>
				domain.voyages.charterPiece({
					charter: `do ${title}`,
					dependsOn: [],
					expectation: `${title} is landed`,
					role: "hand",
					title,
					voyageId: voyage.id,
				});
			const alpha = yield* charter("alpha");
			const bravo = yield* charter("bravo");
			const crewed = yield* domain.voyages.workNow(alpha.id);
			const status = yield* kernel
				.changes(crewed.intentId)
				.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));
			expect(status).toBe("succeeded");
			const crew = yield* sessionFor(scripted, crewed.agentId);

			const outcome = yield* callTool(crew, "request_ruling", {
				...ASK,
				gates: [bravo.id],
			});

			expect(outcome).toMatchObject({
				ok: true,
				text: expect.stringContaining("pressing; holds 1 piece(s)."),
			});
			expect(yield* gatedPieceIds).toEqual([bravo.id]);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
