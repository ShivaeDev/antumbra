import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Effect, Layer } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { decodeSessionExecutionStatus } from "#session-execution-status.ts";

const sessionsToReconcile = Effect.gen(function* () {
	const db = yield* Database;
	const alive = yield* db.Agent.where({ status: "alive" }).all();
	const aliveIds = new Set(alive.map((agent) => agent.id));
	const open = yield* db.AgentSession.where({ status: "open" }).all();
	const sessions = open.filter((session) => aliveIds.has(session.agentId));
	const recover: Array<string> = [];
	const siesta: Array<string> = [];
	for (const session of sessions) {
		const executionStatus = yield* Effect.fromResult(
			decodeSessionExecutionStatus(session.id, session.executionStatus),
		);
		if (executionStatus === "active") {
			recover.push(session.id);
		}
		if (executionStatus === "draining") {
			siesta.push(session.id);
		}
	}
	return { recover, siesta };
});

export const AgentRecoveryLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const recoveries = yield* kernel.active(domain.recover);
		const siestas = yield* kernel.active(domain.siesta);
		const alreadyRecovering = new Set(
			recoveries.map((intent) => intent.payload.sessionId),
		);
		const alreadyDraining = new Set(
			siestas.map((intent) => intent.payload.sessionId),
		);
		const sessions = yield* sessionsToReconcile;
		yield* Effect.forEach(
			sessions.recover.filter((sessionId) => !alreadyRecovering.has(sessionId)),
			(sessionId) => kernel.submit(domain.recover, { sessionId }),
			{ concurrency: 1 },
		);
		yield* Effect.forEach(
			sessions.siesta.filter((sessionId) => !alreadyDraining.has(sessionId)),
			(sessionId) => kernel.submit(domain.siesta, { sessionId }),
			{ concurrency: 1 },
		);
	}),
);
