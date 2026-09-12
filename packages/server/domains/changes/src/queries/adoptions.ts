import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const adoptions = query("adoptions", {
	input: {},
	output: Schema.Array(adoptionRequest.Row),
	reads: [adoptionRequest],
	run: Effect.fn("changes.adoptions")(function* (_input, rows) {
		return yield* rows.changeAdoptionRequest.where({});
	}),
});
