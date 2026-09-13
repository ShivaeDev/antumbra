import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";

export const quietSet = fact("QuietSet", {
	id: VoyageId,
	quietedAt: Schema.NullOr(Schema.String),
});
