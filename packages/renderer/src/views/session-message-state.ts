import type { Fleet, SessionSummary } from "@antumbra/contract";
import { presenceNote, wakeNote } from "#views/session-presence-words.ts";

const WAKE_KIND = "agent/recover";

const sessionOf = (
	fleet: Fleet | undefined,
	sessionId: string,
): SessionSummary | undefined =>
	fleet?.agents
		.flatMap((agent) => agent.sessions)
		.find((session) => session.id === sessionId);

const refusal = (session: SessionSummary | undefined): string | undefined => {
	if (session === undefined) return "this session is not on the fleet";
	return session.canSend ? undefined : presenceNote[session.presence];
};

const wake = (session: SessionSummary | undefined): string | undefined => {
	const pending = session?.diag.intents.find(
		(intent) => intent.kind === WAKE_KIND,
	);
	if (pending === undefined) return undefined;
	return pending.state === "waiting" ? wakeNote.parked : wakeNote.underway;
};

const note = (session: SessionSummary | undefined): string | undefined =>
	session === undefined || session.presence === "working"
		? undefined
		: presenceNote[session.presence];

export const sessionMessageState = (
	fleet: Fleet | undefined,
	sessionId: string,
) => {
	const session = sessionOf(fleet, sessionId);
	const blocked = refusal(session);
	return {
		blocked,
		session,
		standing: blocked ?? wake(session) ?? note(session),
	};
};
