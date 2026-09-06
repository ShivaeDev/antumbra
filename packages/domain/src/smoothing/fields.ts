import { Schema } from "effect";

export const SMOOTH_TAG = "board/smooth";

export const SMOOTH_PIECE_TAG = "board/smooth-piece";

export const SMOOTHER_ROLE = "smoother";

export const SmoothPayload = Schema.Struct({ throughToday: Schema.Boolean, voyageId: Schema.String });

export type SmoothFields = typeof SmoothPayload.Type;

export const SmoothPiecePayload = Schema.Struct({ pieceId: Schema.String, voyageId: Schema.String });

export type SmoothPieceFields = typeof SmoothPiecePayload.Type;
