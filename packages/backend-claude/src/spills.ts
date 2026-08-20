import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
	AgentEvent,
	Origin,
	RawPayload,
} from "@antumbra/vocabulary/session-events";
import { isRecord } from "#blocks.ts";

// why: a tool result too large to travel inline reaches the stream as a short
// preview while the provider keeps the full bytes in its own tool-results
// directory. The transcript would otherwise show a truncated result as if it
// were the whole one, so the loss is journaled where it happened, with the
// path and size the provider named left in detail for whoever reads it back.
export const spilledPreview = (
	raw: RawPayload,
	message: SDKMessage,
	origin: Origin | undefined,
): ReadonlyArray<AgentEvent> => {
	if (!("tool_use_result" in message) || !isRecord(message.tool_use_result)) {
		return [];
	}
	const spill = message.tool_use_result;
	if (typeof spill.persistedOutputPath !== "string") {
		return [];
	}
	const size =
		typeof spill.persistedOutputSize === "number"
			? ` (${spill.persistedOutputSize} bytes)`
			: "";
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
