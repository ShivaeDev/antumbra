import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { ruling } from "#rows/ruling.ts";
export const awaitingDelivery = query("awaitingDelivery", {
	input: {},
	output: Schema.Array(ruling.Row),
	reads: [ruling],
	run: Effect.fn("rulings.awaitingDelivery")(function* (_input, rows) {
		const all = yield* rows.ruling.where({});
		return all.filter((ruling) => ruling.answer !== null && ruling.deliveredAt === null && ruling.requester.kind === "agent");
	}),
});
