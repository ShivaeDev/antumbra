import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const pendingAdoptions = query("pendingAdoptions", {
	input: {},
	output: Schema.Array(adoptionRequest.Row),
	reads: [adoptionRequest],
	run: Effect.fn("changes.pendingAdoptions")(function* (_input, rows) {
		return (yield* rows.changeAdoptionRequest.where({})).filter((row) => row.error === null);
	}),
});
