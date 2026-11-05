import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Schema } from "effect";
import { inputRetried } from "#facts/retried.ts";
import { sessionInput } from "#rows/input.ts";
export const retry = command("retry", {
	input: { id: SessionInputId },
	reads: [sessionInput, session, capacity, sessionOperation],
	emits: inputRetried,
	rejections: { DeliverySettled: { inputId: Schema.String }, InputRefused: { inputId: Schema.String, detail: Schema.String } },
});
