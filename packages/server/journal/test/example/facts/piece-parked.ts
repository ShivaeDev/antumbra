import { fact } from "@antumbra/journal";
import { Schema } from "effect";
import { PieceId } from "#example/ids.ts";

export const pieceParked = fact("PieceParked", { pieceId: PieceId, reason: Schema.String });
