import type { AgentEvent, RawPayload, SessionState } from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import { ThreadStatusNotification } from "#protocol.ts";

const decodeStatus = Schema.decodeUnknownOption(ThreadStatusNotification);

type Status = typeof ThreadStatusNotification.Type.status;

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
