import type { Fleet, SessionSummary } from "@antumbra/contract";
import { useState } from "react";
import { sendToSession } from "#adapters/trpc.ts";
import {
	buttonStyle,
	inputStyle,
	mutedStyle,
	rowStyle,
} from "#views/styles.ts";

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

const boxStyle: React.CSSProperties = {
	borderTop: "1px solid #2e323a",
	display: "flex",
	flexDirection: "column",
	gap: "0.3rem",
	padding: "0.7rem 1.4rem",
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
		<div style={boxStyle}>
			<div style={rowStyle}>
				<input
					disabled={blocked !== undefined}
					onChange={(event) => setText(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							send();
						}
					}}
					placeholder="say something to this session"
					style={{ ...inputStyle, flex: 1 }}
					title={blocked}
					value={text}
				/>
				<button
					disabled={!ready}
					onClick={send}
					style={{ ...buttonStyle, opacity: ready ? 1 : 0.5 }}
					type="button"
				>
					send
				</button>
			</div>
			{blocked === undefined ? null : <span style={mutedStyle}>{blocked}</span>}
		</div>
	);
};
