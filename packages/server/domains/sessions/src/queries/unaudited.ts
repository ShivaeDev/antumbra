import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { session } from "#rows/session.ts";
export const unaudited = query("unaudited", {
	input: {},
	output: Schema.Array(Schema.Struct({ node: session.Row, root: session.Row })),
	reads: [session],
	run: Effect.fn("sessions.unaudited")(function* (_input, rows) {
		const nodes = yield* rows.session.where({ status: "closed", completeness: "recording" });
		const result: Array<{ node: typeof session.Row.Type; root: typeof session.Row.Type }> = [];
		for (const node of nodes) {
			const root = yield* rows.session.get(node.rootSessionId);
			if (node.nativeRef !== null && root.nativeRef !== null) result.push({ node, root });
		}
		return result;
	}),
});
