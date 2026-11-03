import { fact } from "@antumbra/platform-feature/fact.ts";
import { PieceLaunched } from "@antumbra/platform-vocabulary/piece.ts";

export const pieceLaunched = fact("PieceLaunched", PieceLaunched.fields);
