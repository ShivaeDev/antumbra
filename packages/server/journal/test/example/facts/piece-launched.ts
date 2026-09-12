import { fact } from "@antumbra/platform-feature/fact.ts";
import { PieceId } from "#example/ids.ts";

export const pieceLaunched = fact("PieceLaunched", { pieceId: PieceId });
