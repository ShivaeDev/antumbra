import { Schema } from "effect";

export const ChangeVerdict = Schema.Literals(["dismissed"]);
export type ChangeVerdict = typeof ChangeVerdict.Type;

export const PieceVerdict = Schema.Literals(["abandoned", "delivered"]);
export type PieceVerdict = typeof PieceVerdict.Type;
