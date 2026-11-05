import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";
import { voyage } from "#rows/voyage.ts";

export const byId = query("byId", {
	input: { id: VoyageId },
	output: Schema.NullOr(voyage.Row),
	reads: [voyage],
});
