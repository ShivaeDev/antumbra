import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const pieceParked = fact("PieceParked", { id: PieceId, parkedAt: Schema.String });
