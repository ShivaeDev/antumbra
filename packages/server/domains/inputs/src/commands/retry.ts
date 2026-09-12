import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { SessionId, SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Option, Schema } from "effect";
import { inputRetried } from "#facts/retried.ts";
import { sessionInput } from "#rows/input.ts";
export const retry = command("retry", {
	input: { id: SessionInputId },
	reads: [sessionInput, session, capacity, sessionOperation],
	emits: inputRetried,
	rejections: { DeliverySettled: { inputId: Schema.String }, InputRefused: { inputId: Schema.String, detail: Schema.String } },
	run: Effect.fn("inputs.retry")(function* (input, rows, reject) {
		const stored = yield* rows.sessionInput.find(input.id);
		if (Option.isNone(stored) || stored.value.status !== "refused") return yield* reject.DeliverySettled({ inputId: input.id });
		const operations = yield* rows.sessionOperation.where({ inputId: input.id });
		if (operations.some((operation) => operation.status === "requested")) return yield* reject.DeliverySettled({ inputId: input.id });
		const target = yield* rows.session.find(SessionId.make(stored.value.sessionId));
		if (Option.isNone(target) || target.value.status !== "open" || target.value.parentSessionId !== null)
			return yield* reject.InputRefused({ inputId: input.id, detail: "only an open root session can receive input" });
		const capacities = yield* rows.capacity.where({});
		const blocked = capacities.some((reading) => reading.backend === target.value.backend && reading.status === "blocked");
		return {
			id: input.id,
			sessionId: target.value.id,
			operationId: SessionOperationId.make(input.requestId),
			deliveryKind: target.value.attached && !blocked ? ("steer" as const) : ("wake" as const),
		};
	}),
});
