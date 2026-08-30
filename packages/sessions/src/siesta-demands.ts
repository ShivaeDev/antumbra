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
import { sessionAtRest } from "#at-rest.ts";
import { idleSessionsPastThreshold } from "#idle.ts";
import { rootSessions } from "#roots.ts";
import type { SiestaFields } from "#siesta.ts";
import { LiveDelegations } from "#tree/live.ts";

// why: the clock asks one thing of the record — is a process being held for
// nothing — and it asks it of Sessions this process is actually holding. It
// never asks the opposite question. A Session whose process is gone is
// stranded, and stranding is reported, not repaired: only a send or a hail
// takes a Session back up, so nothing here goes looking for one to resume.
const siestaDemands = Effect.gen(function* () {
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
	const siesta: Array<SiestaFields> = [];
	for (const session of sessions) {
		const status = decodeStoredAgentSessionStatus(session.id, session.status);
		const agentStatus = agentStatuses.get(session.agentId);
		// why: a row the vocabulary cannot read is left alone rather than acted
		// on. The projection that publishes it refuses out loud already, and a
		// sweep is the wrong place to learn what a word means.
		if (
			Result.isFailure(status) ||
			(agentStatus !== undefined && Result.isFailure(agentStatus))
		) {
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
				attached: attached.has(session.id),
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
	return siesta;
});

export const compileSessionSiestaDemands = (siesta: IntentKind<SiestaFields>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const fabric = yield* SessionFabric;
		const live = yield* LiveDelegations;
		return [
			defineIntentDemand({
				eligible: siestaDemands.pipe(
					Effect.provideService(Database, db),
					Effect.provideService(SessionFabric, fabric),
					Effect.provideService(LiveDelegations, live),
				),
				identify: ({ sessionId }) => sessionId,
				kind: siesta,
			}),
		];
	});
