import type { RawPayload } from "@antumbra/vocabulary/session-events";

const SOURCE = "claude";

// why: every event this backend maps carries the provider bytes it was read
// from, and they are stamped in one place so the two lanes this provider has —
// the live stream and the mirrored transcript — name their source the same way.
export const claudeRaw = (kind: string, payload: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(payload),
	source: SOURCE,
});
