import { defineIntentDemand } from "@antumbra/intent-demand";
import type { IntentKind } from "@antumbra/kernel";
import { Database, type WriteExecutors } from "@antumbra/persistence";
import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Result } from "effect";
import { decodeSessionExecutionStatus } from "#session-execution-status.ts";
import type { RecoveryFields } from "#session-recovery.ts";
import type { SiestaFields } from "#session-siesta.ts";

const sessionDemands = Effect.gen(function* () {
	const db = yield* Database;
	const agents = yield* db.Agent.all();
	const agentStatuses = new Map(
		agents.map(
			(agent) =>
				[agent.id, decodeStoredAgentStatus(agent.id, agent.status)] as const,
		),
	);
	const sessions = yield* db.AgentSession.all();
	const recover: Array<RecoveryFields> = [];
	const siesta: Array<SiestaFields> = [];
	for (const session of sessions) {
		const status = decodeStoredAgentSessionStatus(session.id, session.status);
		const agentStatus = agentStatuses.get(session.agentId);
		if (
			Result.isFailure(status) ||
			(agentStatus !== undefined && Result.isFailure(agentStatus))
		) {
			recover.push({ sessionId: session.id });
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
			recover.push({ sessionId: session.id });
		}
		if (executionStatus === "draining") {
			siesta.push({ sessionId: session.id });
		}
	}
	return { recover, siesta };
});

export const compileAgentRecoveryDemands = (
	recover: IntentKind<RecoveryFields>,
	siesta: IntentKind<SiestaFields>,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const executors = yield* Effect.context<WriteExecutors>();
		const discover = sessionDemands.pipe(
			Effect.provideService(Database, db),
			Effect.provideContext(executors),
		);
		return [
			defineIntentDemand({
				eligible: discover.pipe(Effect.map(({ recover: demand }) => demand)),
				identify: ({ sessionId }) => sessionId,
				kind: recover,
			}),
			defineIntentDemand({
				eligible: discover.pipe(Effect.map(({ siesta: demand }) => demand)),
				identify: ({ sessionId }) => sessionId,
				kind: siesta,
			}),
		];
	});
