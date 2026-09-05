import { BoardScope, Boards } from "@antumbra/boards";
import { AgentDomain, type SpawnFields } from "@antumbra/domain";
import { VoyageProcedureService } from "@antumbra/domain/voyages/service";
import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { endsTurn, it } from "@antumbra/testing";
import type { ScriptedBackend, ScriptedSession } from "@antumbra/testing-runtime";
import { Voyages } from "@antumbra/voyages";
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

const workingCrew = Effect.gen(function* () {
	const pieces = yield* Pieces;
	const procedures = yield* VoyageProcedureService;
	const voyageRecords = yield* Voyages;
	const kernel = yield* Kernel;
	const voyage = yield* voyageRecords.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	const piece = yield* pieces.charter({
		charter: "sound the shallows",
		dependsOn: [],
		expectation: "the soundings are recorded",
		role: "hand",
		title: "soundings",
		voyageId: voyage.id,
	});
	const crewed = yield* procedures.workNow(piece.id);
	expect(yield* terminalStatus(kernel.changes(crewed.intentId))).toBe("succeeded");
	return { agentId: crewed.agentId, piece, voyage };
});

const spawnByHand = Effect.gen(function* () {
	const kernel = yield* Kernel;
	const domain = yield* AgentDomain;
	const id = crypto.randomUUID();
	const hand: SpawnFields = {
		agentId: `agent-${id}`,
		backend: "scripted",
		charter: "sound the shallows",
		role: "hand",
		runner: "local",
		sessionId: `session-${id}`,
	};
	const submission = yield* kernel.submit(domain.spawn, hand);
	expect(yield* terminalStatus(submission.changes)).toBe("succeeded");
	return hand;
});

it.effectApp("a crew member lands a report against the piece it was spawned for", { clock: "live" }, function* ({ db, scripted }) {
	const procedures = yield* VoyageProcedureService;
	const crew = yield* workingCrew;
	const live = yield* sessionOf(scripted, crew.agentId);

	expect(yield* callTool(live, "land_report", { body: "the eastern shoal is charted", title: "soundings" })).toEqual({
		ok: true,
		text: "report landed",
	});
	expect(yield* db.Report.where({ authorAgentId: crew.agentId }).all()).toMatchObject([{ authorAgentId: crew.agentId, title: "soundings" }]);
	yield* endsTurn(scripted, Option.getOrThrow(yield* db.AgentSession.where({ agentId: crew.agentId }).first()).id);
	expect(Option.getOrThrow(yield* procedures.read(crew.voyage.id).pipe(Effect.orDie)).pieces.find((piece) => piece.id === crew.piece.id)?.state).toBe(
		"done",
	);
});

it.effectApp("arguments the model got wrong come back as a refusal", { clock: "live" }, function* ({ db, scripted }) {
	const crew = yield* workingCrew;
	const live = yield* sessionOf(scripted, crew.agentId);
	const outcome = yield* callTool(live, "land_report", { title: 7 });
	expect(outcome.ok).toBe(false);
	expect(outcome.text).toContain("land_report");
	expect(yield* db.Report.where({ authorAgentId: crew.agentId }).all()).toEqual([]);
});

it.effectApp("a session with no piece has nothing to land against", { clock: "live" }, function* ({ scripted }) {
	const hand = yield* spawnByHand;
	const live = yield* sessionOf(scripted, hand.agentId);
	expect(yield* callTool(live, "land_report", { body: "nowhere to put this", title: "adrift" })).toEqual({
		ok: false,
		text: "you are not on a piece",
	});
});

it.effectApp("crew write to the board of their piece and of its voyage", { clock: "live" }, function* ({ scripted }) {
	const boards = yield* Boards;
	const crew = yield* workingCrew;
	const live = yield* sessionOf(scripted, crew.agentId);
	expect(yield* callTool(live, "write_board", { body: "the shoal is steeper than charted", scope: "piece" })).toEqual({
		ok: true,
		text: "written to the piece board",
	});
	expect(yield* callTool(live, "write_board", { body: "the swell is running", scope: "voyage" })).toEqual({
		ok: true,
		text: "written to the voyage board",
	});
	expect(yield* boards.read(BoardScope.Piece({ pieceId: crew.piece.id }))).toMatchObject([
		{ authorAgentId: crew.agentId, body: "the shoal is steeper than charted", register: "rough" },
	]);
	expect(yield* callTool(live, "read_board", { scope: "voyage" })).toEqual({ ok: true, text: "[rough] the swell is running" });
	expect(yield* boards.read(BoardScope.Voyage({ voyageId: crew.voyage.id }))).toMatchObject([{ body: "the swell is running" }]);
});

it.effectApp("mail tools read without marking and receipt only when asked", { clock: "live" }, function* ({ scripted }) {
	const boards = yield* Boards;
	const crew = yield* workingCrew;
	const live = yield* sessionOf(scripted, crew.agentId);
	const entry = yield* boards
		.mail({
			authorAgentId: Option.none(),
			body: "the admiral selected this mail",
			precedence: "priority",
			sourceRef: "selection:tool-test",
			toAgentId: crew.agentId,
		})
		.pipe(Effect.orDie);
	const first = yield* callTool(live, "read_mail", undefined);
	const second = yield* callTool(live, "read_mail", undefined);
	expect(first).toMatchObject({ ok: true });
	expect(first.text).toContain(entry.id);
	expect(second.text).toContain(entry.id);
	expect(yield* callTool(live, "mark_read", { entryIds: [entry.id] })).toEqual({ ok: true, text: "marked read" });
	expect(yield* callTool(live, "read_mail", undefined)).toEqual({ ok: true, text: "No mail." });
});

it.effectApp("a session with no piece has no board but its own", { clock: "live" }, function* ({ scripted }) {
	const hand = yield* spawnByHand;
	const live = yield* sessionOf(scripted, hand.agentId);
	expect(yield* callTool(live, "read_board", { scope: "voyage" })).toEqual({ ok: false, text: "you have no voyage board" });
	expect(yield* callTool(live, "write_board", { body: "sounded nothing yet", scope: "self" })).toEqual({
		ok: true,
		text: "written to the self board",
	});
	expect(yield* callTool(live, "read_board", { scope: "self" })).toEqual({ ok: true, text: "[rough] sounded nothing yet" });
});

it.effectApp("a turn ending preserves the agent and session that took it", { clock: "live" }, function* ({ db, scripted }) {
	const hand = yield* spawnByHand;
	const live = yield* sessionOf(scripted, hand.agentId);
	const before = {
		agent: yield* db.Agent.where({ id: hand.agentId }).first(),
		moorage: yield* db.Moorage.where({ agentId: hand.agentId }).first(),
		session: yield* db.AgentSession.where({ id: hand.sessionId }).first(),
	};
	yield* endsTurn(scripted, hand.sessionId);
	const agent = Option.getOrThrow(yield* db.Agent.where({ id: hand.agentId }).first());
	const session = Option.getOrThrow(yield* db.AgentSession.where({ id: hand.sessionId }).first());
	expect(agent.status).toBe("alive");
	expect(session.status).toBe("open");
	expect(session.executionStatus).toBe("idle");
	expect(yield* live.closed).toBe(false);
	expect(yield* db.Agent.where({ id: hand.agentId }).first()).toEqual(before.agent);
	expect(yield* db.Moorage.where({ agentId: hand.agentId }).first()).toEqual(before.moorage);
	expect(session).toEqual({ ...Option.getOrThrow(before.session), executionStatus: "idle" });
});
