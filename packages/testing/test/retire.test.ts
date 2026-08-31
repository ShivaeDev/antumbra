import { AgentDomain } from "@antumbra/domain";
import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import type { ScriptedBackend } from "@antumbra/testing-runtime";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";

const terminalStatus = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow), Effect.orDie);

const standDown = (scripted: ScriptedBackend, sessionId: string) =>
	Effect.gen(function* () {
		const session = yield* scripted.session(sessionId);
		const tool = session?.tools.find((candidate) => candidate.name === "stand_down");
		if (tool === undefined) {
			return yield* Effect.die(`the session has no stand_down tool: ${sessionId}`);
		}
		yield* tool.call(undefined);
	});

const workingCrew = Effect.gen(function* () {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const voyage = yield* domain.voyages
		.open({
			backend: "scripted",
			context: "the reef is uncharted",
			name: "Chart the reef",
			northStar: "every shoal is known",
		})
		.pipe(Effect.orDie);
	const piece = yield* domain.voyages
		.charterPiece({
			charter: "sound the northern shoals",
			dependsOn: [],
			expectation: "the depths are recorded",
			role: "hand",
			title: "soundings",
			voyageId: voyage.id,
		})
		.pipe(Effect.orDie);
	const crewed = yield* domain.voyages.workNow(piece.id).pipe(Effect.orDie);
	expect(yield* terminalStatus(kernel.changes(crewed.intentId))).toBe("succeeded");
	const session = Option.getOrThrow(yield* db.AgentSession.where({ agentId: crewed.agentId }).first());
	return { agentId: crewed.agentId, pieceId: piece.id, sessionId: session.id };
});

const retiring = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(domain.retire, { agentId });
		const status = yield* terminalStatus(submission.changes);
		const intent = yield* db.Intent.where({ id: submission.id }).first();
		return { detail: Option.getOrThrow(intent).detail, status };
	});

const seedRetirementRows = (input: {
	readonly agentId: string;
	readonly agentStatus: string;
	readonly currentSessionId: string | null;
	readonly executionStatus: string;
	readonly sessionId: string;
}) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: "sound the northern shoals",
			currentSessionId: input.currentSessionId,
			id: input.agentId,
			role: "hand",
			status: input.agentStatus,
		});
		yield* db.AgentSession.create({
			agentId: input.agentId,
			backend: "scripted",
			charterDeliveredAt: new Date(1),
			createdAt: new Date(1),
			cwd: `/tmp/${input.agentId}`,
			executionStatus: input.executionStatus,
			id: input.sessionId,
			nativeRef: `native-${input.agentId}`,
			parentSessionId: null,
			rootSessionId: input.sessionId,
			status: "open",
		} satisfies NewAgentSession);
	});

it.effectApp("an abandoned piece's crew is retired on the very next pass", { clock: "live" }, function* ({ db, scripted }) {
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const crewed = yield* workingCrew;
	yield* standDown(scripted, crewed.sessionId);
	yield* domain.voyages.landPieceVerdict(crewed.pieceId, "abandoned").pipe(Effect.orDie);
	const demand = Option.getOrThrow(Option.fromUndefinedOr(domain.intentDemands.find((registration) => registration.tag === "agent/retire")));
	yield* demand.pass.pipe(Effect.orDie);
	const demanded = yield* db.Intent.where({ tag: "agent/retire" }).all();
	expect(demanded).toHaveLength(1);
	expect(demanded[0]?.payload).toContain(crewed.agentId);
	const intentId = Option.getOrThrow(Option.fromUndefinedOr(demanded[0]?.id));
	expect(yield* terminalStatus(kernel.changes(intentId))).toBe("succeeded");
	expect(Option.getOrThrow(yield* db.Agent.where({ id: crewed.agentId }).first()).status).toBe("retired");
});

it.effectApp("retiring an agent that is working refuses by name", { clock: "live" }, function* ({ db }) {
	const crew = yield* workingCrew;
	const refused = yield* retiring(crew.agentId);

	expect(refused.status).toBe("failed");
	expect(refused.detail).toContain("is working in session");
	expect(Option.getOrThrow(yield* db.Agent.where({ id: crew.agentId }).first()).status).toBe("alive");
});

it.effectApp("retiring an agent that has stood down is allowed through", { clock: "live" }, function* ({ db, scripted }) {
	const crew = yield* workingCrew;
	yield* standDown(scripted, crew.sessionId);

	expect((yield* retiring(crew.agentId)).status).toBe("succeeded");
	expect(Option.getOrThrow(yield* db.Agent.where({ id: crew.agentId }).first()).status).toBe("retired");
});

it.effectApp("retiring an agent whose tree is stranded is not refused", { clock: "live" }, function* ({ db }) {
	const agentId = "agent-stranded";
	const sessionId = "session-agent-stranded";
	yield* seedRetirementRows({
		agentId,
		agentStatus: "alive",
		currentSessionId: sessionId,
		executionStatus: "active",
		sessionId,
	});

	expect((yield* retiring(agentId)).status).toBe("succeeded");
	expect(Option.getOrThrow(yield* db.Agent.where({ id: agentId }).first()).status).toBe("retired");
	expect(Option.getOrThrow(yield* db.AgentSession.where({ id: sessionId }).first()).status).toBe("closed");
});

it.effectApp("a retried retirement closes Sessions left behind the terminal row", { clock: "live" }, function* ({ db }) {
	const agentId = "agent-retired-prefix";
	const sessionId = "session-retired-prefix";
	yield* seedRetirementRows({
		agentId,
		agentStatus: "retired",
		currentSessionId: null,
		executionStatus: "idle",
		sessionId,
	});

	expect((yield* retiring(agentId)).status).toBe("succeeded");
	expect(Option.getOrThrow(yield* db.AgentSession.where({ id: sessionId }).first()).status).toBe("closed");
});
