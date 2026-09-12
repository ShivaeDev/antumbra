import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingParked = fact("RulingParked", { rulingId: RulingId, note: Schema.String });
