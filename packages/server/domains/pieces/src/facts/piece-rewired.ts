import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const pieceRewired = fact("PieceRewired", { id: PieceId, dependsOn: Schema.Array(PieceId) });
