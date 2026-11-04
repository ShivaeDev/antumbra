import { PieceId as IdSchema } from "@antumbra/platform-vocabulary/piece.ts";

export const PieceId = IdSchema;
export type PieceId = typeof PieceId.Type;

export const edgeId = (from: PieceId, to: PieceId): string => `${from}/${to}`;

export const assignmentWorkId = (agentId: string, pieceId: PieceId): string => JSON.stringify([agentId, pieceId]);
export const rulingGateId = (rulingId: string, pieceId: PieceId): string => JSON.stringify([rulingId, pieceId]);
