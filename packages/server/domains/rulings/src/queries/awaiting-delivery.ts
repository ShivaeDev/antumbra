import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { ruling } from "#rows/ruling.ts";
export const awaitingDelivery = query("awaitingDelivery", {
	input: {},
	output: Schema.Array(ruling.Row),
	reads: [ruling],
});
