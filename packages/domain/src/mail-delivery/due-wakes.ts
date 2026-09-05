import { Boards, dueMail, type MailBatch } from "@antumbra/boards";
import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { openSessions, rootSessions } from "@antumbra/sessions";
import { decodeSessionExecutionStatus, decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Clock, Effect, Result } from "effect";

const MILLIS_PER_MINUTE = 60_000;

export interface DueWake {
	readonly agentId: string;
	readonly batch: MailBatch;
	readonly sessionId: string;
	readonly unreadIds: ReadonlyArray<string>;
	readonly waitedMillis: number;
}

const restingRootSessions = Effect.fn("MailDelivery.restingRootSessions")(function* () {
	const db = yield* Database;
	const sessions = yield* db.AgentSession.where(rootSessions).where(openSessions).all();
	const agents = yield* db.Agent.where((agent) => agent.id.in(sessions.map((session) => session.agentId))).all();
	const statuses = new Map(agents.map((agent) => [agent.id, decodeStoredAgentStatus(agent.id, agent.status)] as const));
	return yield* Effect.filter(sessions, (session) => {
		const status = statuses.get(session.agentId);
		if (status === undefined || Result.isFailure(status) || status.success !== "alive") {
			return Effect.succeed(false);
		}
		return Effect.map(Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus)), (execution) => execution === "idle");
	});
});

export const dueWakes = Effect.fn("MailDelivery.dueWakes")(function* () {
	const boards = yield* Boards;
	const settings = yield* SettingsSource;
	const { settings: chosen } = yield* settings.current;
	const quietMillis = chosen.routineMailMinutes * MILLIS_PER_MINUTE;
	const nowMillis = yield* Clock.currentTimeMillis;
	const resting = yield* restingRootSessions();
	const due: Array<DueWake> = [];
	for (const session of resting) {
		const unread = yield* boards.unread(session.agentId);
		const batch = dueMail({ nowMillis, quietMillis, unread });
		if (batch === undefined) {
			continue;
		}
		const earliest = Math.min(...unread.map((entry) => entry.createdAt.getTime()));
		due.push({
			agentId: session.agentId,
			batch,
			sessionId: session.id,
			unreadIds: unread.map((entry) => entry.id),
			waitedMillis: nowMillis - earliest,
		});
	}
	return due;
});
