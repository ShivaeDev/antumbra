import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { restart } from "#rows/restart.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.NullOr(Schema.Array(SessionId)),
	reads: [restart, flag],
});
