import type { RpcServerRequest } from "#adapters/rpc.ts";

const DECLINED = "declined by antumbra: no approval consumer is wired yet";

// why: v0 runs workspace-write plus codex's own auto reviewer, so the
// server asks us only for what the reviewer would not grant — and until an
// approval consumer exists on our side, every residual prompt is declined
// rather than silently accepted. Declining completes the item as declined;
// the turn goes on.
export const residualApproval = (
	request: RpcServerRequest,
): unknown | undefined => {
	switch (request.method) {
		case "item/commandExecution/requestApproval":
		case "item/fileChange/requestApproval":
			return { decision: "decline" };
		case "item/permissions/requestApproval":
			return { permissions: {}, scope: "turn" };
		case "item/tool/requestUserInput":
			return { answers: {} };
		case "mcpServer/elicitation/request":
			return { _meta: null, action: "decline", content: null };
		case "execCommandApproval":
		case "applyPatchApproval":
			return { decision: { denied: { rejection: DECLINED } } };
		default:
			return undefined;
	}
};
