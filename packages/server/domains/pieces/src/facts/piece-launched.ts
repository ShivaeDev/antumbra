import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";

export const pieceLaunched = fact("PieceLaunched", { id: PieceId, launchedAt: Schema.String });
