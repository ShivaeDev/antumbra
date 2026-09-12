import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { AgentId, PieceAgentId } from "#ids.ts";

export const pieceAgent = row(
	"pieceAgent",
	{ id: PieceAgentId, pieceId: PieceId, agentId: AgentId, assignedAt: Schema.String },
	{ key: "id", scope: "pieceId" },
);
