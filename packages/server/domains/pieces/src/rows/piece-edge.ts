import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const pieceEdge = row("pieceEdge", { id: Schema.String, from: PieceId, to: PieceId }, { key: "id", scope: "to" });
