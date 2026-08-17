import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
} from "@antumbra/agent-runtime-vocabulary";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Effect, Layer, Result } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { decodeSessionExecutionStatus } from "#session-execution-status.ts";

const sessionsToReconcile = Effect.gen(function* () {
	const db = yield* Database;
	const agents = yield* db.Agent.all();
	const agentStatuses = new Map(
		agents.map(
			(agent) =>
				[agent.id, decodeStoredAgentStatus(agent.id, agent.status)] as const,
		),
	);
	const sessions = yield* db.AgentSession.all();
	const recover: Array<string> = [];
	const siesta: Array<string> = [];
	for (const session of sessions) {
		const status = decodeStoredAgentSessionStatus(session.id, session.status);
		const agentStatus = agentStatuses.get(session.agentId);
		if (
			Result.isFailure(status) ||
			(agentStatus !== undefined && Result.isFailure(agentStatus))
		) {
			recover.push(session.id);
			continue;
		}
		if (
			agentStatus === undefined ||
			agentStatus.success !== "alive" ||
			status.success !== "open"
		) {
			continue;
		}
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
