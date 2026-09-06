import type { AgentEvent } from "@antumbra/vocabulary/session-events/events.ts";
import type { RawPayload } from "@antumbra/vocabulary/session-events/raw.ts";

export const rawOf = (kind: string, payload: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(payload),
	source: "opencode",
});

export const rawEvent = (raw: RawPayload): AgentEvent[] => [{ raw, type: "raw" }];
