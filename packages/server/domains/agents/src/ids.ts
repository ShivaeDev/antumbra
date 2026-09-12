import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const AgentId = Id.brand("AgentId");
export type AgentId = typeof AgentId.Type;
export const VoyageAgentId = Id.brand("VoyageAgentId");
export const PieceAgentId = Id.brand("PieceAgentId");
export const voyageAgentId = (voyageId: string, agentId: string) => VoyageAgentId.make(`${voyageId}:${agentId}`);
export const pieceAgentId = (pieceId: string, agentId: string) => PieceAgentId.make(`${pieceId}:${agentId}`);
