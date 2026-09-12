import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { StartId } from "#ids.ts";
export const startHeld = fact("StartHeld", { id: StartId, reason: Schema.String });
