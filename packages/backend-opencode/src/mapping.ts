import type { AgentEvent, RawPayload } from "@antumbra/vocabulary/session-events.ts";

export const rawOf = (kind: string, payload: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(payload),
	source: "opencode",
});

export const rawEvent = (raw: RawPayload): AgentEvent[] => [{ raw, type: "raw" }];
