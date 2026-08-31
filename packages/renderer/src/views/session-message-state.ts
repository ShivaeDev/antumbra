import type { Fleet, IntentDiagnostic, SessionSummary } from "@antumbra/contract";
import { presenceNote, wakeNote, wakeReason } from "#views/session-presence-words.ts";

const WAKE_KIND = "agent/wake";

const sessionOf = (fleet: Fleet | undefined, sessionId: string): SessionSummary | undefined =>
	fleet?.agents.flatMap((agent) => agent.sessions).find((session) => session.id === sessionId);

const refusal = (session: SessionSummary | undefined): string | undefined => {
	if (session === undefined) return "this session is not on the fleet";
	return session.canSend ? undefined : presenceNote[session.presence];
};

const wakeOf = (session: SessionSummary | undefined): IntentDiagnostic | undefined =>
	session?.diag.intents.find((intent) => intent.kind === WAKE_KIND);

const wake = (pending: IntentDiagnostic | undefined): string | undefined => {
	if (pending === undefined) return undefined;
	return pending.state === "waiting" ? wakeNote.parked : wakeNote.underway;
};

const note = (session: SessionSummary | undefined): string | undefined =>
	session === undefined || session.presence === "working" ? undefined : presenceNote[session.presence];

export const sessionMessageState = (fleet: Fleet | undefined, sessionId: string) => {
	const session = sessionOf(fleet, sessionId);
	const blocked = refusal(session);
	const pending = wakeOf(session);
	const waking = wake(pending);
	const standing = blocked ?? waking ?? note(session);
	return {
		blocked,
		reason: standing === waking && pending !== undefined ? wakeReason(pending.detail) : undefined,
		session,
		standing,
	};
};
