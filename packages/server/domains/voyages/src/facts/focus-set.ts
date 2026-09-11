import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";

export const focusSet = fact("FocusSet", {
	id: VoyageId,
	focusedAt: Schema.NullOr(Schema.String),
});
