import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { session } from "#rows/session.ts";
export const unaudited = query("unaudited", {
	input: {},
	output: Schema.Array(Schema.Struct({ node: session.Row, root: session.Row })),
	reads: [session],
});
