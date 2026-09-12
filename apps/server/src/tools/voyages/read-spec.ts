import { defineTool } from "@antumbra/platform-tool-schemas/define.ts";
import { Schema } from "effect";

export const readVoyageSpec = defineTool({
	description: "Read a Voyage's Pieces, progress, active agents and outcomes. Defaults to your Voyage.",
	input: Schema.Struct({
		voyageId: Schema.optional(
			Schema.String.annotate({
				description: "The Voyage ID. Omit for your own Voyage.",
			}),
		),
	}),
	name: "read_voyage",
});
