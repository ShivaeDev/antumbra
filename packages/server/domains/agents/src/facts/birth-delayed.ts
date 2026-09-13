import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { BirthId } from "#ids.ts";
export const birthDelayed = fact("BirthDelayed", { id: BirthId, reason: Schema.String });
