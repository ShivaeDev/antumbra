import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { RawPayload } from "@antumbra/platform-vocabulary/session-events/raw.ts";
import type { KnownPart } from "#protocol-parts.ts";

type ToolPart = Extract<KnownPart, { type: "tool" }>;

export const toolEvents = (raw: RawPayload, part: ToolPart, announce: (callId: string) => boolean): AgentEvent[] => {
	const { state } = part;
	if (state.status === "completed" || state.status === "error") {
		return [
			{
				ok: state.status === "completed",
				output: state.output ?? state.error ?? "",
				raw,
				toolId: part.callID,
				type: "tool.completed",
			},
		];
	}
	if (state.status === "pending" || !announce(part.callID)) {
		return [];
	}
	return [
		{
			input: JSON.stringify(state.input ?? {}),
			name: part.tool,
			raw,
			toolId: part.callID,
			type: "tool.started",
		},
	];
};
