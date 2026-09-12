import { fact } from "@antumbra/platform-feature/fact.ts";
import { RulingAuthoritySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingWithdrawn = fact("RulingWithdrawn", { rulingId: RulingId, by: RulingAuthoritySchema, note: Schema.String });
