import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Schema } from "effect";
import { sessionInput } from "#rows/input.ts";
export const deliveryReading = query("deliveryReading", {
	input: { inputId: SessionInputId },
	output: Schema.Struct({ input: Schema.NullOr(sessionInput.Row), operation: Schema.NullOr(sessionOperation.Row) }),
	reads: [sessionInput, sessionOperation],
});
