import type { AgentEvent, RawPayload, SessionState } from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import { rawEvent } from "#mapping.ts";
import { SessionErrorProperties, SessionStatusProperties } from "#protocol.ts";

const decodeStatus = Schema.decodeUnknownOption(SessionStatusProperties);
const decodeError = Schema.decodeUnknownOption(SessionErrorProperties);

const stateOf = (type: string): SessionState | undefined => {
	if (type === "idle") {
		return "idle";
	}
	return type === "busy" || type === "retry" ? "running" : undefined;
};

const ABORTED = "MessageAbortedError";

export interface TurnBoundary {
	readonly errored: (raw: RawPayload, properties: unknown) => AgentEvent[];
	readonly idled: (raw: RawPayload) => AgentEvent[];
	readonly status: (raw: RawPayload, properties: unknown) => AgentEvent[];
}

export const openTurnBoundary = (): TurnBoundary => {
	let running = false;
	let outcome: "failed" | "interrupted" | undefined;
	return {
		errored: (raw, properties) => {
			outcome = Option.match(decodeError(properties), {
				onNone: () => "failed" as const,
				onSome: ({ error }) => (error?.name === ABORTED ? "interrupted" : "failed"),
			});
			return rawEvent(raw);
		},
		idled: (raw) => {
			if (!running) {
				return [];
			}
			running = false;
			const status = outcome ?? "completed";
			outcome = undefined;
			return [{ raw, status, type: "turn.completed" }];
		},
		status: (raw, properties) =>
			Option.match(decodeStatus(properties), {
				onNone: () => rawEvent(raw),
				onSome: ({ status }) => {
					const state = stateOf(status.type);
					if (state === undefined) {
						return rawEvent(raw);
					}
					running = running || state === "running";
					return [{ raw, state, type: "session.state" }];
				},
			}),
	};
};
