import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { RawPayload } from "@antumbra/vocabulary/session-events";

export const claudeRaw = (kind: string, payload: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(payload),
	source: "claude",
});

export const rawOf = (message: SDKMessage): RawPayload => {
	const subtype = "subtype" in message && typeof message.subtype === "string" ? `/${message.subtype}` : "";
	return claudeRaw(`${message.type}${subtype}`, message);
};
