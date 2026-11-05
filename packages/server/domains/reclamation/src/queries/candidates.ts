import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { berth } from "#rows/berth.ts";
import { heldResource } from "#rows/held-resource.ts";
import { moorage } from "#rows/moorage.ts";
import { resourceOwner } from "#rows/resource-owner.ts";

export const candidates = query("candidates", {
	input: {},
	output: Schema.Array(moorage.Row),
	reads: [resourceOwner, moorage, berth, heldResource],
});
