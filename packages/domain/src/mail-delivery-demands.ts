import { Boards, dueMail } from "@antumbra/boards";
import { SettingsSource } from "@antumbra/contract";
import { IntentDemandPassFailed, type IntentDemandRegistration } from "@antumbra/intent-demand";
import { Database } from "@antumbra/persistence";
import { mailWords } from "@antumbra/prompts";
import { openSessions, rootSessions } from "@antumbra/sessions";
import { decodeSessionExecutionStatus, decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Cause, Clock, Effect, Result } from "effect";
import { KernelReach } from "#kernel-reach.ts";

const MILLIS_PER_MINUTE = 60_000;

export const MAIL_DELIVERY_TAG = "session/mail-delivery";

export const makeMailDelivery = Effect.gen(function* () {
	const boards = yield* Boards;
	const db = yield* Database;
	const reach = yield* KernelReach;
	const settings = yield* SettingsSource;
	return Effect.gen(function* () {
		const { settings: chosen } = yield* settings.current;
		const quietMillis = chosen.routineMailMinutes * MILLIS_PER_MINUTE;
		const nowMillis = yield* Clock.currentTimeMillis;
		const sessions = yield* db.AgentSession.where(rootSessions).where(openSessions).all();
		const agents = yield* db.Agent.where((agent) => agent.id.in(sessions.map((session) => session.agentId))).all();
		const statuses = new Map(agents.map((agent) => [agent.id, decodeStoredAgentStatus(agent.id, agent.status)] as const));
		for (const session of sessions) {
			const status = statuses.get(session.agentId);
			if (status === undefined || Result.isFailure(status) || status.success !== "alive") {
				continue;
			}
			const executionStatus = yield* Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus));
			if (executionStatus !== "idle") {
				continue;
			}
			const unread = yield* boards.unread(session.agentId);
			const batch = dueMail({ nowMillis, quietMillis, unread });
			if (batch === undefined || (yield* reach.wakePending(session.id))) {
				continue;
			}
			yield* reach.rouseSession({ message: mailWords(batch), sessionId: session.id });
			// Stamping after the wake is accepted leaves refused mail due on the next pass.
			yield* boards.markDelivered(
				session.agentId,
				unread.map((entry) => entry.id),
			);
		}
	});
});

export const compileMailDeliveryDemands = (deliver: Effect.Effect<void, unknown>): ReadonlyArray<IntentDemandRegistration> => [
	{
		pass: deliver.pipe(
			Effect.catchCause((cause) => Effect.fail(new IntentDemandPassFailed({ detail: Cause.pretty(cause), tag: MAIL_DELIVERY_TAG }))),
		),
		tag: MAIL_DELIVERY_TAG,
	},
];
