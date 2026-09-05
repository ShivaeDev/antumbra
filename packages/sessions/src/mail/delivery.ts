import { type BoardEntryRow, Boards } from "@antumbra/boards";
import { SettingsSource } from "@antumbra/contract";
import { IntentDemandPassFailed, type IntentDemandRegistration } from "@antumbra/intent-demand";
import { Database } from "@antumbra/persistence";
import { mailWords } from "@antumbra/prompts";
import { decodeSessionExecutionStatus, decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Cause, Clock, Effect, Result } from "effect";
import { dueMail, type UnreadMail } from "#mail/due.ts";
import { SessionReach } from "#reach.ts";
import { openSessions, rootSessions } from "#roots.ts";

const MILLIS_PER_MINUTE = 60_000;

export const MAIL_DELIVERY_TAG = "session/mail-delivery";

const unreadOf = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<UnreadMail> =>
	entries.flatMap((entry) => (entry.kind === "mail" ? [{ createdAtMillis: entry.createdAt.getTime(), precedence: entry.precedence }] : []));

export const makeMailDelivery = Effect.gen(function* () {
	const boards = yield* Boards;
	const db = yield* Database;
	const reach = yield* SessionReach;
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
			const batch = dueMail({
				atRest: executionStatus === "idle",
				nowMillis,
				quietMillis,
				unread: unreadOf(yield* boards.unread(session.agentId)),
			});
			if (batch === undefined || (yield* reach.wakePending(session.id))) {
				continue;
			}
			yield* reach.rouseSession({ message: mailWords(batch), sessionId: session.id });
		}
	});
});

export const compileSessionMailDemands = (deliver: Effect.Effect<void, unknown>): ReadonlyArray<IntentDemandRegistration> => [
	{
		pass: deliver.pipe(
			Effect.catchCause((cause) => Effect.fail(new IntentDemandPassFailed({ detail: Cause.pretty(cause), tag: MAIL_DELIVERY_TAG }))),
		),
		tag: MAIL_DELIVERY_TAG,
	},
];
