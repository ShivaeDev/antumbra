import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { Effect } from "effect";
import { definition } from "#app.ts";
import { connectRunner } from "#runner.ts";

export const prepareArtifactSource = Effect.fn("TestArtifacts.prepareSource")(function* (identity: {
	readonly agentId: string;
	readonly sessionId: string;
}) {
	const runner = yield* connectRunner({ runnerId: "local", logId: `log:${identity.agentId}`, backends: ["claude"], imageInputBackends: [] });
	const api = yield* apiOf(definition);
	const agentId = AgentId.make(identity.agentId);
	yield* api.starts.request({
		agentId,
		sessionId: SessionId.make(identity.sessionId),
		backend: "claude",
		model: null,
		effort: null,
		pieceId: null,
		voyageId: null,
		role: "worker",
		charter: "Read artifact source",
		source: "direct",
		toolSetVersion: "1",
		tools: [],
	});
	yield* api.reclamation.plan({ agentId, runner: "local", plan: { root: "/moorage", berths: [] } });
	yield* api.reclamation.ready({ agentId });
	return runner;
});
