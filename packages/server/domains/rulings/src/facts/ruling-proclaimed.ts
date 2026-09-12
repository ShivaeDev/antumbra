import { fact } from "@antumbra/platform-feature/fact.ts";
import { RulingAuthoritySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
import { requestInput } from "#commands/inputs.ts";
import { RulingId } from "#ids.ts";
export const rulingProclaimed = fact("RulingProclaimed", {
	id: RulingId,
	...requestInput,
	by: RulingAuthoritySchema,
	answer: Schema.NonEmptyString,
	chosenChoice: Schema.NullOr(Schema.String),
});
