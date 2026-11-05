import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";
import { voyageProgress } from "#rows/voyage-progress.ts";

export const progress = query("progress", {
	input: { id: VoyageId },
	output: Schema.NullOr(voyageProgress.Row),
	reads: [voyageProgress],
});
