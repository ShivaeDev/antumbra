import { Option } from "effect";
import type { RpcServerRequest } from "#adapters/rpc.ts";

const DECLINED = "declined by antumbra: no approval consumer is wired yet";

// why: v0 runs workspace-write plus codex's own auto reviewer, so the
// server asks us only for what the reviewer would not grant — and until an
// approval consumer exists on our side, every residual prompt is declined
// rather than silently accepted. Declining completes the item as declined;
// the turn goes on. A method we serve no answer for is `None`, which the
// caller turns into an honest refusal.
export const residualApproval = (
	request: RpcServerRequest,
): Option.Option<unknown> => {
	switch (request.method) {
		case "item/commandExecution/requestApproval":
		case "item/fileChange/requestApproval":
			return Option.some({ decision: "decline" });
		case "item/permissions/requestApproval":
			return Option.some({ permissions: {}, scope: "turn" });
		case "item/tool/requestUserInput":
			return Option.some({ answers: {} });
		case "mcpServer/elicitation/request":
			return Option.some({ _meta: null, action: "decline", content: null });
		case "execCommandApproval":
		case "applyPatchApproval":
			return Option.some({ decision: { denied: { rejection: DECLINED } } });
		default:
			return Option.none();
	}
};
