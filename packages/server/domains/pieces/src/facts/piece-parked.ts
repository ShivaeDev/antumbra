import { fact } from "@antumbra/platform-feature/fact.ts";
import { PieceParked } from "@antumbra/platform-vocabulary/piece.ts";

export const pieceParked = fact("PieceParked", PieceParked.fields);
