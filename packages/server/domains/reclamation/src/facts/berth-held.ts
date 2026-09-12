import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { BerthId } from "#ids.ts";

export const berthHeld = fact("BerthHeld", { id: BerthId, reason: Schema.String });
