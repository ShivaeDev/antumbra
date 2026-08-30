import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { RawPayload } from "@antumbra/vocabulary/session-events";

const SOURCE = "claude";

// why: every event this backend maps carries the provider bytes it was read
// from, and they are built in one place so every lane this provider has —
// the live stream, the mirrored transcript, and the census that reads what
// neither carried — names its source the same way.
export const claudeRaw = (kind: string, payload: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(payload),
	source: SOURCE,
});

export const rawOf = (message: SDKMessage): RawPayload => {
	const subtype =
		"subtype" in message && typeof message.subtype === "string"
			? `/${message.subtype}`
			: "";
	return claudeRaw(`${message.type}${subtype}`, message);
};
