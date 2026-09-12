import { fact } from "@antumbra/platform-feature/fact.ts";
import { PieceId } from "#ids.ts";

export const pieceUnparked = fact("PieceUnparked", { id: PieceId });
