import { Schema } from "effect";

export const VoyageKindSchema = Schema.Literals(["voyage", "flagship"]);
export type VoyageKind = typeof VoyageKindSchema.Type;
