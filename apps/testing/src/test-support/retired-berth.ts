import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Reclamation } from "@antumbra/server-reclamation/service.ts";
import { Effect } from "effect";

export const retiredBerth = Effect.fn("PostgresApp.retiredBerth")(function* (source: string, branch: string) {
	const requestId = Request.make("retired-berth-owner");
	const { agentId } = identity(requestId);
	const agents = yield* Agents;
	const resources = yield* Reclamation;
	yield* agents.spawn({ requestId, role: "hand", backend: "claude", model: null, effort: null });
	yield* resources.plan({
		requestId: Request.make("retired-berth-plan"),
		agentId,
		runner: "local",
		plan: { root: "/moorage", berths: [{ slug: "reef", source, ref: "main", branch, path: "/reef" }] },
	});
	yield* resources.ready({ requestId: Request.make("retired-berth-ready"), agentId });
	yield* agents.retire({ requestId: Request.make("retired-berth-retired"), id: agentId });
	return agentId;
});
