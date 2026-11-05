import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
import { session } from "#rows/session.ts";

const Node = Schema.Struct({ ...session.fields, depth: Schema.Number, displayName: Schema.String });
export const tree = query("tree", {
	input: { rootSessionId: SessionId },
	output: Schema.Array(Node),
	reads: [session],
});
