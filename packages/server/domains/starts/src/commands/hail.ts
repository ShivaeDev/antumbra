import { captain } from "@antumbra/domain-agents/queries/captain.ts";
import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { pieceAgent } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { startRequested } from "#facts/start-requested.ts";
import { StartId } from "#ids.ts";

const { id: _id, wakeSessionId: _wake, ...fields } = startRequested.payload;
export const hail = command("hail", {
	input: fields,
	reads: [agent, pieceAgent, voyageAgent, session, voyage],
	emits: startRequested,
	rejections: {
		UnknownVoyage: { id: Schema.String },
		CaptainAlreadyHailed: { agentId: Schema.String },
		CaptainSessionUnavailable: { agentId: Schema.String },
		AgentExists: { id: Schema.String },
	},
	run: Effect.fn("Starts.hail")(function* (input, rows, reject) {
		if (input.voyageId === null || !(yield* rows.voyage.exists(input.voyageId))) return yield* reject.UnknownVoyage({ id: input.voyageId ?? "" });
		const current = yield* captain.run({ voyageId: input.voyageId }, rows);
		if (current?.status === "spawning") return yield* reject.CaptainAlreadyHailed({ agentId: current.id });
		let wakeSessionId: null | typeof session.Row.Type.id = null;
		if (current?.status === "alive") {
			const roots = yield* rows.session.where({ agentId: current.id, parentSessionId: null, status: "open" });
			const root = roots.find((held) => held.id === current.currentSessionId);
			if (root === undefined) return yield* reject.CaptainSessionUnavailable({ agentId: current.id });
			wakeSessionId = root.id;
		} else if (Option.isSome(yield* rows.agent.find(input.agentId))) return yield* reject.AgentExists({ id: input.agentId });
		return {
			id: StartId.make(input.requestId),
			wakeSessionId,
			agentId: input.agentId,
			sessionId: input.sessionId,
			voyageId: input.voyageId,
			pieceId: null,
			backend: input.backend,
			model: input.model,
			effort: input.effort,
			role: "captain",
			charter: input.charter,
			toolSetVersion: input.toolSetVersion,
			tools: input.tools,
		};
	}),
});
