import { fact } from "@antumbra/platform-feature/fact.ts";
import { RulingAuthoritySchema, RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingReclassified = fact("RulingReclassified", {
	rulingId: RulingId,
	radius: Schema.NullOr(RulingRadiusSchema),
	urgency: Schema.NullOr(RulingUrgencySchema),
	note: Schema.NullOr(Schema.String),
	by: RulingAuthoritySchema,
	byAgentId: Schema.NullOr(Schema.String),
});
