import { identity } from "@antumbra/domain-agents/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { Effect } from "effect";
import { definition } from "#app.ts";
import { connectRunner } from "#runner.ts";

export const prepareArtifactSource = Effect.fn("TestArtifacts.prepareSource")(function* (asked: { readonly agentId: string }) {
	const runner = yield* connectRunner({ runnerId: "local", logId: `log:${asked.agentId}`, backends: ["claude"], imageInputBackends: [] });
	const api = yield* apiOf(definition);
	const requestId = Id.Request.make(asked.agentId);
	const ids = identity(requestId);
	yield* api.agents.spawn({ requestId, role: "worker", backend: "claude", model: null, effort: null });
	yield* api.reclamation.plan({ agentId: ids.agentId, runner: "local", plan: { root: "/moorage", berths: [] } });
	yield* api.reclamation.ready({ agentId: ids.agentId });
	return { runner, agentId: ids.agentId, sessionId: ids.sessionId };
});
