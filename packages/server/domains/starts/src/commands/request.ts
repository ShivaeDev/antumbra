import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { pieceAgent } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceAssignmentWork } from "@antumbra/domain-pieces/rows/piece-assignment-work.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { startRequested } from "#facts/start-requested.ts";
import { StartId } from "#ids.ts";

const { id: _id, wakeSessionId: _wake, ...fields } = startRequested.payload;
export const request = command("request", {
	input: fields,
	reads: [pieceAssignmentWork, agent, voyageAgent, pieceAgent, piece, voyage, session],
	emits: startRequested,
	rejections: {
		PieceAbandoned: { pieceId: Schema.String },
		PieceAlreadyCrewed: { pieceId: Schema.String, agentId: Schema.String },
		AgentExists: { id: Schema.String },
		Unknown: { kind: Schema.String, id: Schema.String },
		CaptainAlreadyHailed: { agentId: Schema.String },
	},
	run: Effect.fn("Starts.request")(function* (input, rows, reject) {
		if (yield* rows.agent.exists(input.agentId)) return yield* reject.AgentExists({ id: input.agentId });
		if (input.pieceId !== null && !(yield* rows.piece.exists(input.pieceId))) return yield* reject.Unknown({ kind: "piece", id: input.pieceId });
		if (input.source !== "direct" && input.pieceId !== null) {
			const held = yield* rows.piece.get(input.pieceId);
			if (held.verdict === "abandoned") return yield* reject.PieceAbandoned({ pieceId: held.id });
			const working = (yield* rows.pieceAssignmentWork.where({ pieceId: held.id, working: true }))[0];
			if (working !== undefined) return yield* reject.PieceAlreadyCrewed({ pieceId: held.id, agentId: working.agentId });
		}
		if (input.voyageId !== null && !(yield* rows.voyage.exists(input.voyageId))) return yield* reject.Unknown({ kind: "voyage", id: input.voyageId });
		if (input.voyageId !== null && input.pieceId === null && input.role === "captain") {
			const links = yield* rows.voyageAgent.where({ voyageId: input.voyageId, role: "captain" });
			const assigned = new Set((yield* rows.pieceAgent.where({})).map((link) => link.agentId));
			const ids = new Set(links.filter((link) => !assigned.has(link.agentId)).map((link) => link.agentId));
			const current = (yield* rows.agent.where({})).find((held) => ids.has(held.id) && (held.status === "alive" || held.status === "spawning"));
			if (current !== undefined) return yield* reject.CaptainAlreadyHailed({ agentId: current.id });
		}
		return {
			wakeSessionId: null,
			id: StartId.make(input.requestId),
			agentId: input.agentId,
			sessionId: input.sessionId,
			voyageId: input.voyageId,
			pieceId: input.pieceId,
			backend: input.backend,
			model: input.model,
			effort: input.effort,
			role: input.role,
			charter: input.charter,
			source: input.source,
			toolSetVersion: input.toolSetVersion,
			tools: input.tools,
		};
	}),
});
