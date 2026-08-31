import { Option } from "effect";
import type { RpcServerRequest } from "#adapters/rpc.ts";

const DECLINED = "declined by antumbra: no approval consumer is wired yet";

export const residualApproval = (request: RpcServerRequest): Option.Option<unknown> => {
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
