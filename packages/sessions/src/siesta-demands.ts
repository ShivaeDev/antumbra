import { SettingsSource } from "@antumbra/contract";
import { defineIntentDemand } from "@antumbra/intent-demand";
import type { IntentKind } from "@antumbra/kernel";
import { Database, or } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { decodeSessionExecutionStatus, decodeStoredAgentStatus, sessionPresence } from "@antumbra/vocabulary/agent-runtime";
import { Clock, Effect, Result } from "effect";
import { sessionAtRest } from "#at-rest.ts";
import { openSessions, rootSessions } from "#roots.ts";
import type { SiestaFields } from "#siesta.ts";
import { LiveDelegations } from "#tree/live.ts";

const MILLIS_PER_MINUTE = 60_000;

// This demand only reclaims attached idle roots; it never resumes detached or stranded Sessions.
const siestaDemands = Effect.gen(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const live = yield* LiveDelegations;
	const settings = yield* SettingsSource;
	const { settings: chosen } = yield* settings.current;
	// A live child keeps its root attached because the tree shares one provider stream.
	const delegating = yield* live.delegating();
	const attached = yield* fabric.attached();
	const now = yield* Clock.currentTimeMillis;
	const threshold = chosen.idleSiestaMinutes * MILLIS_PER_MINUTE;
	const overdue = new Set([...(yield* fabric.idleSince())].flatMap(([sessionId, since]) => (now - since >= threshold ? [sessionId] : [])));
	const sessions = yield* db.AgentSession.where(rootSessions)
		.where(openSessions)
		.where((session) => or(session.executionStatus.eq("draining"), session.id.in([...overdue])))
		.all();
	const agents = yield* db.Agent.where((agent) => agent.id.in(sessions.map((session) => session.agentId))).all();
	const agentStatuses = new Map(agents.map((agent) => [agent.id, decodeStoredAgentStatus(agent.id, agent.status)] as const));
	const siesta: Array<SiestaFields> = [];
	for (const session of sessions) {
		const agentStatus = agentStatuses.get(session.agentId);
		if (agentStatus === undefined || Result.isFailure(agentStatus) || agentStatus.success !== "alive") {
			continue;
		}
		const executionStatus = yield* Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus));
		// Draining completes a prior shutdown; ordinary idle siesta requires both the threshold and a settled tree.
		const restful = sessionAtRest({
			delegating: delegating.has(session.id),
			presence: sessionPresence({
				attached: attached.has(session.id),
				executionStatus,
				open: true,
			}),
		});
		if (executionStatus === "draining" || (overdue.has(session.id) && restful)) {
			siesta.push({ sessionId: session.id });
		}
	}
	return siesta;
});

export const compileSessionSiestaDemands = (siesta: IntentKind<SiestaFields>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const fabric = yield* SessionFabric;
		const live = yield* LiveDelegations;
		const settings = yield* SettingsSource;
		return [
			defineIntentDemand({
				eligible: siestaDemands.pipe(
					Effect.provideService(Database, db),
					Effect.provideService(SessionFabric, fabric),
					Effect.provideService(LiveDelegations, live),
					Effect.provideService(SettingsSource, settings),
				),
				identify: ({ sessionId }) => sessionId,
				kind: siesta,
			}),
		];
	});
