import type { AgentEvent, RateLimitWindow, RawPayload } from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";

export const RATE_LIMITS_METHOD = "account/rateLimits/updated";

const CodexWindow = Schema.Struct({
	resetsAt: Schema.optional(Schema.NullOr(Schema.Number)),
	usedPercent: Schema.Number,
	windowDurationMins: Schema.optional(Schema.NullOr(Schema.Number)),
});

const RateLimitsNotification = Schema.Struct({
	rateLimits: Schema.Struct({
		primary: Schema.optional(Schema.NullOr(CodexWindow)),
		rateLimitReachedType: Schema.optional(Schema.NullOr(Schema.String)),
		secondary: Schema.optional(Schema.NullOr(CodexWindow)),
	}),
});

type Snapshot = typeof RateLimitsNotification.Type.rateLimits;
type Window = typeof RateLimitWindow.Type;

const decodeRateLimits = Schema.decodeUnknownOption(RateLimitsNotification);

const present = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

const windowOf = (window: typeof CodexWindow.Type): Window => ({
	...(present(window.windowDurationMins) ? { durationMinutes: window.windowDurationMins } : {}),
	...(present(window.resetsAt) ? { resetsAt: window.resetsAt * 1000 } : {}),
	usedPercent: window.usedPercent,
});

const event = (raw: RawPayload, snapshot: Snapshot): AgentEvent => ({
	raw,
	status: present(snapshot.rateLimitReachedType) ? "rejected" : "unknown",
	type: "rate.limit",
	windows: [snapshot.primary, snapshot.secondary].filter(present).map(windowOf),
});

export const rateLimitEvents = (raw: RawPayload, params: unknown): AgentEvent[] =>
	Option.match(decodeRateLimits(params), {
		onNone: () => [{ raw, type: "raw" }],
		onSome: ({ rateLimits }) => [event(raw, rateLimits)],
	});
