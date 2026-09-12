import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceAssignmentWork } from "@antumbra/domain-pieces/rows/piece-assignment-work.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { birthRequested } from "#facts/birth-requested.ts";
import { identity } from "#ids.ts";
import { agent } from "#rows/agent.ts";

export const request = command("request", {
	input: { voyageId: VoyageId, pieceId: PieceId, role: Schema.String },
	reads: [pieceAssignmentWork, agent, piece, voyage],
	emits: birthRequested,
	rejections: {
		PieceAbandoned: { pieceId: Schema.String },
		PieceAlreadyCrewed: { pieceId: Schema.String, agentId: Schema.String },
		AgentExists: { id: Schema.String },
		Unknown: { kind: Schema.String, id: Schema.String },
	},
	run: Effect.fn("Agents.request")(function* (input, rows, reject) {
		const ids = identity(input.requestId);
		if (yield* rows.agent.exists(ids.agentId)) return yield* reject.AgentExists({ id: ids.agentId });
		if (!(yield* rows.voyage.exists(input.voyageId))) return yield* reject.Unknown({ kind: "voyage", id: input.voyageId });
		if (!(yield* rows.piece.exists(input.pieceId))) return yield* reject.Unknown({ kind: "piece", id: input.pieceId });
		const held = yield* rows.piece.get(input.pieceId);
		if (held.verdict === "abandoned") return yield* reject.PieceAbandoned({ pieceId: held.id });
		const working = (yield* rows.pieceAssignmentWork.where({ pieceId: held.id, working: true }))[0];
		if (working !== undefined) return yield* reject.PieceAlreadyCrewed({ pieceId: held.id, agentId: working.agentId });
		return {
			wakeSessionId: null,
			id: ids.birthId,
			source: "dispatch" as const,
			agentId: ids.agentId,
			sessionId: ids.sessionId,
			voyageId: input.voyageId,
			pieceId: input.pieceId,
			backend: null,
			model: null,
			effort: null,
			role: input.role,
		};
	}),
});
