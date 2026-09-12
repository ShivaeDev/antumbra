import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Option, Schema } from "effect";
import { sessionInput } from "#rows/input.ts";
export const deliveryReading = query("deliveryReading", {
	input: { inputId: SessionInputId },
	output: Schema.Struct({ input: Schema.NullOr(sessionInput.Row), operation: Schema.NullOr(sessionOperation.Row) }),
	reads: [sessionInput, sessionOperation],
	run: Effect.fn("inputs.deliveryReading")(function* (input, rows) {
		const operations = yield* rows.sessionOperation.where({ inputId: input.inputId });
		const latest = operations
			.filter((operation) => operation.status !== "cancelled")
			.sort((left, right) => right.requestedAt.localeCompare(left.requestedAt))[0];
		return {
			input: Option.getOrNull(yield* rows.sessionInput.find(input.inputId)),
			operation: latest ?? null,
		};
	}),
});
