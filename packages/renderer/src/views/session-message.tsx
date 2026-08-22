import type { Fleet, SessionSummary } from "@antumbra/contract";
import { useState } from "react";
import { sendToSession } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";
import { presenceNote } from "#views/session-presence-words.ts";

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
	const [text, setText] = useState("");
	const session = sessionOf(fleet, sessionId);
	const blocked = refusal(session);
	const standing = blocked ?? note(session);
	const ready = blocked === undefined && text.trim() !== "";
	const send = () => {
		if (!ready) {
			return;
		}
		sendToSession(sessionId, text, () => setText(""), onError);
	};
	return (
		<div className="flex min-w-0 shrink-0 flex-col gap-1 border-t border-border px-4 py-2">
			<div className="flex min-w-0 items-center gap-2">
				<Input
					aria-label="Message this session"
					className="flex-1"
					disabled={blocked !== undefined}
					onChange={(event) => setText(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							send();
						}
					}}
					placeholder="say something to this session"
					title={standing}
					value={text}
				/>
				<Button disabled={!ready} onClick={send} type="button">
					Send
				</Button>
			</div>
			{standing === undefined ? null : (
				<span className="text-2xs text-muted-foreground">{standing}</span>
			)}
		</div>
	);
};
