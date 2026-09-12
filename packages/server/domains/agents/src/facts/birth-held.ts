import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { BirthId } from "#ids.ts";
export const birthHeld = fact("BirthHeld", { id: BirthId, reason: Schema.String });
