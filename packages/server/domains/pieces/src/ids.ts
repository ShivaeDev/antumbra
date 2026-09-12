import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const PieceId = Id.brand("PieceId");
export type PieceId = typeof PieceId.Type;

export const edgeId = (from: PieceId, to: PieceId): string => `${from}/${to}`;
