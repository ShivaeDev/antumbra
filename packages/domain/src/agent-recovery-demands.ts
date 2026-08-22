import { defineIntentDemand } from "@antumbra/intent-demand";
import type { IntentKind } from "@antumbra/kernel";
import { Database, type WriteExecutors } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Clock, Effect, Result } from "effect";
import { idleSessionsPastThreshold } from "#session-idle.ts";
import type { RecoveryFields } from "#session-recovery.ts";
import { rootSessions } from "#session-roots.ts";
import type { SiestaFields } from "#session-siesta.ts";

const sessionDemands = Effect.gen(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	// why: the clock is read once per pass, so every Session in it is judged
	// against the same moment.
	const overdue = idleSessionsPastThreshold(
		yield* fabric.idleSince,
		yield* Clock.currentTimeMillis,
	);
	const agents = yield* db.Agent.all();
	const agentStatuses = new Map(
		agents.map(
			(agent) =>
				[agent.id, decodeStoredAgentStatus(agent.id, agent.status)] as const,
		),
	);
	const sessions = yield* db.AgentSession.where(rootSessions).all();
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
		// why: an idle Session held past the threshold is put to siesta by the
		// system on this pass — the same reconciliation that finishes an
		// interrupted drain, because both are the same question asked of the
		// record: is a process still being held for nothing.
		if (
			executionStatus === "draining" ||
			(executionStatus === "idle" && overdue.has(session.id))
		) {
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
		const fabric = yield* SessionFabric;
		const executors = yield* Effect.context<WriteExecutors>();
		const discover = sessionDemands.pipe(
			Effect.provideService(Database, db),
			Effect.provideService(SessionFabric, fabric),
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
