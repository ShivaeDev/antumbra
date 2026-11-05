import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const pendingAdoptions = query("pendingAdoptions", {
	input: {},
	output: Schema.Array(adoptionRequest.Row),
	reads: [adoptionRequest],
});
