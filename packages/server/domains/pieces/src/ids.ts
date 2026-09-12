import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const PieceId = Id.brand("PieceId");
export type PieceId = typeof PieceId.Type;

export const edgeId = (from: PieceId, to: PieceId): string => `${from}/${to}`;

export const outcomeId = (sourceKind: "report" | "artifact" | "change", sourceId: string, pieceId: PieceId): string =>
	JSON.stringify([sourceKind, sourceId, pieceId]);
export const assignmentWorkId = (agentId: string, pieceId: PieceId): string => JSON.stringify([agentId, pieceId]);
export const rulingGateId = (rulingId: string, pieceId: PieceId): string => JSON.stringify([rulingId, pieceId]);
