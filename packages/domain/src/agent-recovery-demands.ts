import { defineIntentDemand } from "@antumbra/intent-demand";
import type { IntentKind } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	sessionPresence,
} from "@antumbra/vocabulary/agent-runtime";
import { Clock, Effect, Result } from "effect";
import { sessionAtRest } from "#session-at-rest.ts";
import { idleSessionsPastThreshold } from "#session-idle.ts";
import type { RecoveryFields } from "#session-recovery.ts";
import { rootSessions } from "#session-roots.ts";
import type { SiestaFields } from "#session-siesta.ts";
import { LiveDelegations } from "#session-tree-live.ts";

const sessionDemands = Effect.gen(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const live = yield* LiveDelegations;
	// why: the tree's own work counts as the Session's. A root whose child is
	// still speaking is not at rest however long its own row has said idle,
	// because reclaiming it takes away the stream that child is speaking on.
	const delegating = yield* live.delegating();
	const attached = yield* fabric.attached();
	// why: the clock is read once per pass, so every Session in it is judged
	// against the same moment.
	const overdue = idleSessionsPastThreshold(
		yield* fabric.idleSince(),
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
		const held = attached.has(session.id);
		// why: a row saying active outlives the process that made it true, so the
		// fact recover answers is the missing attachment rather than the row. A
		// Session this process still holds already has the one thing a resume
		// would go and get, and recovering it again changes nothing the demand
		// reads — so the ask would repeat every pass for as long as the execution
		// lasts. Asking only for the ones nothing is holding is what lets the
		// demand go quiet: the resume it caused is what makes it ineligible.
		if (executionStatus === "active" && !held) {
			recover.push({ sessionId: session.id });
		}
		// why: an idle Session held past the threshold is put to siesta by the
		// system on this pass — the same reconciliation that finishes an
		// interrupted drain, because both are the same question asked of the
		// record: is a process still being held for nothing.
		//
		// why: the threshold is not the whole test. The clock asks for the same
		// rest the admiral's own request has to satisfy, so a root the hour has
		// come for waits while its tree is still speaking. A drain is exempt: it
		// is shutdown finishing a decision already taken, not rest being chosen.
		const restful = sessionAtRest({
			delegating: delegating.has(session.id),
			presence: sessionPresence({
				attached: held,
				executionStatus,
				open: true,
			}),
		});
		if (
			executionStatus === "draining" ||
			(overdue.has(session.id) && restful)
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
		const live = yield* LiveDelegations;
		const discover = sessionDemands.pipe(
			Effect.provideService(Database, db),
			Effect.provideService(SessionFabric, fabric),
			Effect.provideService(LiveDelegations, live),
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
