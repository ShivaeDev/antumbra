import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
export const rulingContextAdded = fact("RulingContextAdded", {
	rulingId: RulingId,
	body: Schema.String,
	authorAgentId: Schema.NullOr(Schema.String),
});
