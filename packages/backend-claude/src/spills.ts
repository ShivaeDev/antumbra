import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin, RawPayload } from "@antumbra/vocabulary/session-events.ts";
import { isRecord } from "#blocks.ts";

// Oversized tool results carry only a preview inline and name the stored full output in `persistedOutputPath`.
export const spilledPreview = (raw: RawPayload, message: SDKMessage, origin: Origin | undefined): ReadonlyArray<AgentEvent> => {
	if (!("tool_use_result" in message) || !isRecord(message.tool_use_result)) {
		return [];
	}
	const spill = message.tool_use_result;
	if (typeof spill.persistedOutputPath !== "string") {
		return [];
	}
	const size = typeof spill.persistedOutputSize === "number" ? ` (${spill.persistedOutputSize} bytes)` : "";
	return [
		{
			detail: `full tool output spilled to ${spill.persistedOutputPath}${size}`,
			gapKind: "spilled-preview",
			...(origin === undefined ? {} : { origin }),
			raw,
			type: "subsession.gap",
		},
	];
};
