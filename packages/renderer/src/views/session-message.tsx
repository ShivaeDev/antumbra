import type {
	Fleet,
	IntentDiagnostic,
	SessionSummary,
} from "@antumbra/contract";
import { useState } from "react";
import { sendToSession } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";
import { useSessionDraft } from "#hooks/session-draft.ts";
import {
	presenceNote,
	wakeNote,
	wakeReason,
} from "#views/session-presence-words.ts";
import { SessionSituations } from "#views/session-situations.tsx";

const WAKE_KIND = "agent/recover";

const sessionOf = (
	fleet: Fleet | undefined,
	sessionId: string,
): SessionSummary | undefined =>
	fleet?.agents
		.flatMap((agent) => agent.sessions)
		.find((session) => session.id === sessionId);

// why: words reach a Session in every state but one, so the box is closed only
// when there is nothing left to wake. What the rest say is a note about who is
// listening, not an excuse — an asleep Session takes the words and comes back
// with them, and the admiral should send without wondering whether to.
const refusal = (session: SessionSummary | undefined): string | undefined => {
	if (session === undefined) {
		return "this session is not on the fleet";
	}
	return session.canSend ? undefined : presenceNote[session.presence];
};

// why: a live recover is the send's own receipt — the mutation returning is
// only the demand being written down, and the wake it asked for is the part
// the admiral is waiting on. Reading it off the durable state rather than the
// send's return keeps the box honest about a wake this window never asked for,
// and about one still parked from an earlier send.
const wakeOf = (
	session: SessionSummary | undefined,
): IntentDiagnostic | undefined =>
	session?.diag.intents.find((intent) => intent.kind === WAKE_KIND);

const wake = (pending: IntentDiagnostic | undefined): string | undefined => {
	if (pending === undefined) {
		return undefined;
	}
	return pending.state === "waiting" ? wakeNote.parked : wakeNote.underway;
};

const note = (session: SessionSummary | undefined): string | undefined =>
	session === undefined || session.presence === "working"
		? undefined
		: presenceNote[session.presence];

export const SessionMessage = ({
	fleet,
	onError,
	sessionId,
}: {
	readonly fleet: Fleet | undefined;
	readonly onError: (message: string) => void;
	readonly sessionId: string;
}) => {
	const draft = useSessionDraft(sessionId, "message");
	const [sending, setSending] = useState(false);
	const session = sessionOf(fleet, sessionId);
	const blocked = refusal(session);
	const pending = wakeOf(session);
	const waking = wake(pending);
	const standing = blocked ?? waking ?? note(session);
	// why: the wake's own sentence is what turns "parked" into something the
	// admiral can act on, and it is only news while the wake is the standing
	// note — a refusal has already said the more final thing.
	const reason =
		standing === waking && pending !== undefined
			? wakeReason(pending.detail)
			: undefined;
	const ready = blocked === undefined && !sending && draft.text.trim() !== "";
	const send = () => {
		if (!ready) {
			return;
		}
		const sent = draft.capture();
		setSending(true);
		sendToSession(
			sessionId,
			sent.text,
			() => {
				draft.clear(sent);
				setSending(false);
			},
			(message) => {
				setSending(false);
				onError(message);
			},
		);
	};
	return (
		<div className="flex min-w-0 shrink-0 flex-col gap-1 border-t border-border px-4 py-2">
			{blocked === undefined && session !== undefined ? (
				<SessionSituations
					onError={onError}
					sessionId={sessionId}
					situations={session.addressable}
				/>
			) : null}
			<div className="flex min-w-0 items-center gap-2">
				<Input
					aria-label="Message this session"
					className="flex-1"
					disabled={blocked !== undefined}
					onChange={(event) => draft.setText(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							send();
						}
					}}
					placeholder="say something to this session"
					title={standing}
					value={draft.text}
				/>
				<Button disabled={!ready} onClick={send} type="button">
					Send
				</Button>
			</div>
			{standing === undefined ? null : (
				<span className="text-2xs text-muted-foreground">{standing}</span>
			)}
			{reason === undefined ? null : (
				<span className="font-mono text-2xs text-muted-foreground">
					{reason}
				</span>
			)}
		</div>
	);
};
