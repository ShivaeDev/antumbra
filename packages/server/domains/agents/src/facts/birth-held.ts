import { fact } from "@antumbra/platform-feature/fact.ts";
import { BirthId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
export const birthHeld = fact("BirthHeld", { id: BirthId, reason: Schema.String });
