import { fact } from "@antumbra/platform-feature/fact.ts";
import { PieceChartered } from "@antumbra/platform-vocabulary/piece.ts";

export const pieceChartered = fact("PieceChartered", PieceChartered.fields);
