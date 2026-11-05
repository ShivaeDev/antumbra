import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceAssignmentWork } from "@antumbra/domain-pieces/rows/piece-assignment-work.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { birthRequested } from "#facts/birth-requested.ts";
import { agent } from "#rows/agent.ts";

export const workNow = command("workNow", {
	input: { pieceId: PieceId },
	reads: [pieceAssignmentWork, agent, piece, voyage],
	emits: birthRequested,
	rejections: {
		PieceAbandoned: { pieceId: Schema.String },
		PieceAlreadyCrewed: { pieceId: Schema.String, agentId: Schema.String },
		AgentExists: { id: Schema.String },
		Unknown: { kind: Schema.String, id: Schema.String },
	},
});
