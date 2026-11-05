import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { ruling } from "#rows/ruling.ts";
export const frontier = query("frontier", {
	input: { voyageId: VoyageId },
	output: Schema.Array(ruling.Row),
	reads: [ruling],
});
