import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingPassedUp = fact("RulingPassedUp", {
	rulingId: RulingId,
	by: Schema.Literals(["captain", "flagship"]),
	byAgentId: Schema.NullOr(Schema.String),
	note: Schema.String,
});
