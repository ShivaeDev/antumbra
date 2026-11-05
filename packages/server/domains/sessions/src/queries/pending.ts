import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { sessionOperation } from "#rows/session-operation.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.Array(sessionOperation.Row),
	reads: [sessionOperation, flag],
});
