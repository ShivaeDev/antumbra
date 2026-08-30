import type { AgentEvent, RawPayload, SessionState } from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import { ThreadStatusNotification } from "#protocol.ts";

const decodeStatus = Schema.decodeUnknownOption(ThreadStatusNotification);

type Status = typeof ThreadStatusNotification.Type.status;

// why: an active thread is running unless a flag says the turn is stalled on
// somebody answering — an approval or a question — which is the same fact
// claude spells `requires_action`. `notLoaded` and `systemError` are codex's
// words for a thread with no process and a thread that broke; neither is a
// state this vocabulary has, and calling either one idle would tell a reader
// the session is quietly listening when it is not. They stay raw evidence.
const stateOf = (status: Status): SessionState | undefined => {
	if (status.type === "idle") {
		return "idle";
	}
	if (status.type !== "active") {
		return undefined;
	}
	return status.activeFlags.length === 0 ? "running" : "awaiting-input";
};

export const threadStateEvents = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.match(decodeStatus(params), {
		onNone: () => [{ raw, type: "raw" }],
		onSome: ({ status }) => {
			const state = stateOf(status);
			return state === undefined ? [{ raw, type: "raw" }] : [{ raw, state, type: "session.state" }];
		},
	});
