import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { ruling } from "#rows/ruling.ts";
export const awaitingAscent = query("awaitingAscent", {
	input: {},
	output: Schema.Array(ruling.Row),
	reads: [ruling],
	run: Effect.fn("rulings.awaitingAscent")(function* (_input, rows) {
		const all = yield* rows.ruling.where({});
		return all.filter((ruling) => ruling.answer === null && ruling.requester.kind === "agent" && ruling.rung !== "admiral");
	}),
});
