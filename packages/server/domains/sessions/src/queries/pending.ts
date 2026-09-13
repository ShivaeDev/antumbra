import { FLEET } from "@antumbra/domain-settings/ids.ts";
import { allows } from "@antumbra/domain-settings/queries/flags.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { sessionOperation } from "#rows/session-operation.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.Array(sessionOperation.Row),
	reads: [sessionOperation, flag],
	run: Effect.fn("sessions.pending")(function* (_input, rows) {
		const flags = yield* rows.flag.where({ scope: FLEET });
		const requested = yield* rows.sessionOperation.where({ status: "requested" });
		return requested.filter((operation) => operation.gatedBy === null || allows(flags, operation.gatedBy));
	}),
});
