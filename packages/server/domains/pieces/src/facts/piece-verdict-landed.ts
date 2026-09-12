import { fact } from "@antumbra/platform-feature/fact.ts";
import { PieceVerdict } from "@antumbra/platform-vocabulary/verdict.ts";
import { PieceId } from "#ids.ts";

export const pieceVerdictLanded = fact("PieceVerdictLanded", { id: PieceId, verdict: PieceVerdict });
