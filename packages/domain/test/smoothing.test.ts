import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import { VoyageSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { TestClock } from "effect/testing";
import { callTool, completesTurn, type ScriptedBackend } from "#test/harness.ts";
import { openReefVoyage, terminalIntent } from "#test/voyage-fixtures.ts";

const NOTES = ["sounded the eastern shoal at low water", "the channel buoy is adrift"];

const SUMMARY = "The eastern shoal was sounded at low water and the channel buoy was found adrift.";

const roughVoyage = Effect.fnUntraced(function* () {
	const boards = yield* Boards;
	const db = yield* Database;
	const voyage = yield* openReefVoyage;
	yield* db.Agent.create({ charter: "chart the reef", id: "agent-hand", role: "crew", status: "alive" });
	yield* Effect.forEach(NOTES, (body) =>
		boards.write(BoardScope.Voyage({ voyageId: voyage.id }), EntryInput.Note({ authorAgentId: Option.some("agent-hand"), body, register: "rough" })),
	);
	return voyage;
});

const smootherAtWork = Effect.fnUntraced(function* (scripted: ScriptedBackend) {
	const db = yield* Database;
	const { input, sessionId } = yield* scripted.queued;
	const session = yield* scripted.session(sessionId);
	const intent = Option.getOrThrow(yield* db.Intent.where({ tag: "board/smooth" }).first());
	return {
		intentId: intent.id,
		sessionId,
		material: input.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n"),
		session: Option.getOrThrow(Option.fromUndefinedOr(session)),
	};
});

const expectClosedPass = Effect.fnUntraced(function* (sessionId: string) {
	const db = yield* Database;
	const session = Option.getOrThrow(yield* db.AgentSession.where({ id: sessionId }).first());
	expect(session.status).toBe("closed");
	const agent = Option.getOrThrow(yield* db.Agent.where({ id: session.agentId }).first());
	expect(agent.currentSessionId).toBeNull();
});

const smoothingOf = Effect.fnUntraced(function* (voyageId: string) {
	const source = yield* VoyageSource;
	return (yield* source.voyage(voyageId)).smoothing;
});

it.effectApp("a pass writes one summary over the day it was given, and the tail folds under it", function* ({ scripted }) {
	const boards = yield* Boards;
	const db = yield* Database;
	const source = yield* VoyageSource;
	const voyage = yield* roughVoyage();
	const scope = BoardScope.Voyage({ voyageId: voyage.id });
	expect(yield* smoothingOf(voyage.id)).toEqual({ state: "idle", uncovered: 2 });

	yield* source.smoothBoard(voyage.id);
	const pass = yield* smootherAtWork(scripted);
	for (const note of NOTES) {
		expect(pass.material).toContain(note);
	}
	yield* callTool(pass.session, "write_summary", { text: SUMMARY });
	expect(yield* terminalIntent(pass.intentId)).toBe("succeeded");
	yield* expectClosedPass(pass.sessionId);
	expect(yield* pass.session.closed).toBe(true);

	expect(yield* boards.read(scope)).toMatchObject([
		{ kind: "note", register: "rough", seq: 1 },
		{ kind: "note", register: "rough", seq: 2 },
		{ body: SUMMARY, coversFrom: 1, coversTo: 2, kind: "summary", level: "day", register: "smooth", seq: 3 },
	]);
	expect((yield* boards.digest(scope)).map((entry) => entry.seq)).toEqual([3]);
	expect((yield* boards.under(scope, (yield* boards.digest(scope))[0]?.id ?? "")).map((entry) => entry.seq)).toEqual([2, 1]);
	expect(yield* boards.uncovered(scope)).toEqual([]);
	expect(yield* smoothingOf(voyage.id)).toEqual({ state: "idle", uncovered: 0 });

	const smoother = Option.getOrThrow(yield* db.VoyageAgent.where({ role: "smoother", voyageId: voyage.id }).first());
	expect(Option.getOrThrow(yield* db.Agent.where({ id: smoother.agentId }).first())).toMatchObject({ role: "smoother" });
	expect(Option.getOrThrow(yield* db.BoardEntry.where({ kind: "summary" }).first()).authorAgentId).toBe(smoother.agentId);
});

it.effectApp("the smoother sails on Antumbra's own prompt with write_summary and nothing else", function* ({ scripted }) {
	const source = yield* VoyageSource;
	const voyage = yield* roughVoyage();

	yield* source.smoothBoard(voyage.id);
	const pass = yield* smootherAtWork(scripted);
	yield* callTool(pass.session, "write_summary", { text: SUMMARY });
	expect(yield* terminalIntent(pass.intentId)).toBe("succeeded");
	yield* expectClosedPass(pass.sessionId);
	expect(yield* pass.session.closed).toBe(true);

	const opened = yield* scripted.opened;
	const constrained = opened.at(-1);
	expect(constrained?.tools.map((tool) => tool.name)).toEqual(["write_summary"]);
	expect(constrained?.constrainedPrompt).toEqual(expect.any(String));
});

it.effectApp("a pass that writes no summary leaves the log alone and stands as a failure to retry", function* ({ scripted }) {
	const boards = yield* Boards;
	const source = yield* VoyageSource;
	const voyage = yield* roughVoyage();
	const scope = BoardScope.Voyage({ voyageId: voyage.id });

	yield* source.smoothBoard(voyage.id);
	const pass = yield* smootherAtWork(scripted);
	yield* completesTurn(pass.session);
	expect(yield* terminalIntent(pass.intentId)).toBe("failed");
	yield* expectClosedPass(pass.sessionId);
	expect(yield* pass.session.closed).toBe(true);

	expect((yield* boards.read(scope)).map((entry) => entry.kind)).toEqual(["note", "note"]);
	expect(yield* smoothingOf(voyage.id)).toEqual({ state: "failed", uncovered: 2 });
});

it.effectApp("a smoothing pass with nothing uncovered opens no session at all", function* ({ scripted }) {
	const source = yield* VoyageSource;
	const db = yield* Database;
	const voyage = yield* openReefVoyage;

	yield* source.smoothBoard(voyage.id);
	const intent = Option.getOrThrow(yield* db.Intent.where({ tag: "board/smooth" }).first());
	expect(yield* terminalIntent(intent.id)).toBe("succeeded");
	expect(yield* scripted.opened).toEqual([]);
	expect(yield* db.VoyageAgent.where({ role: "smoother" }).count()).toBe(0);
});

it.effectApp("a smoother that never answers fails the pass once its time is up", function* ({ scripted }) {
	const boards = yield* Boards;
	const source = yield* VoyageSource;
	const voyage = yield* roughVoyage();

	yield* source.smoothBoard(voyage.id);
	const pass = yield* smootherAtWork(scripted);
	yield* TestClock.adjust("10 minutes");
	expect(yield* terminalIntent(pass.intentId)).toBe("failed");
	yield* expectClosedPass(pass.sessionId);
	expect(yield* pass.session.closed).toBe(true);

	const db = yield* Database;
	expect((yield* boards.read(BoardScope.Voyage({ voyageId: voyage.id }))).map((entry) => entry.kind)).toEqual(["note", "note"]);
	expect(Option.getOrThrow(yield* db.Intent.where({ id: pass.intentId }).first()).detail).toContain("did not answer in time");
	expect(yield* smoothingOf(voyage.id)).toEqual({ state: "failed", uncovered: 2 });
});
