import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { PieceId, VoyageId } from "#example/ids.ts";

export const pieceChartered = fact("PieceChartered", { pieceId: PieceId, voyageId: VoyageId, title: Schema.String });
