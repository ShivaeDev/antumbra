import type { Fleet, IntentDiagnostic, SessionSummary } from "@antumbra/contract";
import { presenceNote, wakeNote, wakeReason } from "#views/session-presence-words.ts";

const WAKE_KIND = "agent/wake";

const sessionOf = (fleet: Fleet | undefined, sessionId: string): SessionSummary | undefined =>
	fleet?.agents.flatMap((agent) => agent.sessions).find((session) => session.id === sessionId);

const refusal = (session: SessionSummary | undefined): string | undefined => {
	if (session === undefined) return "this session is not on the fleet";
	return session.canSend ? undefined : presenceNote[session.presence];
};

// why: a live wake is the send's own receipt — the mutation returning is
// only the demand being written down, and the wake it asked for is the part the
// admiral is waiting on. Reading it off the durable state rather than the send's
// return keeps the box honest about a wake this window never asked for, and
// about one still parked from an earlier send.
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
		// why: the wake's own sentence is what turns "parked" into something the
		// admiral can act on, and it is only news while the wake is the standing
		// note — a refusal has already said the more final thing.
		reason: standing === waking && pending !== undefined ? wakeReason(pending.detail) : undefined,
		session,
		standing,
	};
};
