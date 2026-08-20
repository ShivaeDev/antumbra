import type { Fleet, SessionSummary } from "@antumbra/contract";
import { useState } from "react";
import { sendToSession } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";

const sessionOf = (
	fleet: Fleet | undefined,
	sessionId: string,
): SessionSummary | undefined =>
	fleet?.agents
		.flatMap((agent) => agent.sessions)
		.find((session) => session.id === sessionId);

// why: the fleet publishes whether words can reach a Session, never why it is
// unreachable, so the refusal is named from what the view is allowed to know.
const refusal = (session: SessionSummary | undefined): string | undefined => {
	if (session === undefined) {
		return "this session is not on the fleet";
	}
	if (session.canSend) {
		return undefined;
	}
	return session.status === "open"
		? "this session is not listening right now"
		: `this session is ${session.status}`;
};

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
	const blocked = refusal(sessionOf(fleet, sessionId));
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
					title={blocked}
					value={text}
				/>
				<Button disabled={!ready} onClick={send} type="button">
					Send
				</Button>
			</div>
			{blocked === undefined ? null : (
				<span className="text-2xs text-muted-foreground">{blocked}</span>
			)}
		</div>
	);
};
