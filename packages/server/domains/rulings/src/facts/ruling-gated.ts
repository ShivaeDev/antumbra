import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingGated = fact("RulingGated", { rulingId: RulingId, pieceIds: Schema.Array(PieceId) });
