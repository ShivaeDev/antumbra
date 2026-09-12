import { fact } from "@antumbra/platform-feature/fact.ts";
import { RulingAuthoritySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingAnswered = fact("RulingAnswered", {
	rulingId: RulingId,
	answer: Schema.String,
	choiceId: Schema.NullOr(Schema.String),
	by: RulingAuthoritySchema,
	byAgentId: Schema.NullOr(Schema.String),
});
