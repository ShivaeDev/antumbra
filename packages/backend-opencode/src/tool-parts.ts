import type {
	AgentEvent,
	RawPayload,
} from "@antumbra/vocabulary/session-events";
import type { KnownPart } from "#protocol-parts.ts";

type ToolPart = Extract<KnownPart, { type: "tool" }>;

// why: a part is re-sent whole on every change, so one call produces many
// frames. The call is announced once — on the first state that carries the
// arguments the model chose, which `pending` does not — and answered once,
// when opencode settles it.
export const toolEvents = (
	raw: RawPayload,
	part: ToolPart,
	announce: (callId: string) => boolean,
): AgentEvent[] => {
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
