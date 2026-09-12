import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option, Schema } from "effect";
import { SessionOperationId } from "#ids.ts";
import { session } from "#rows/session.ts";
import { sessionOperation } from "#rows/session-operation.ts";

export const operationRetried = fact("SessionOperationRetried", { previousId: SessionOperationId, operation: sessionOperation.Row });
export const retry = command("retry", {
	input: { id: SessionOperationId },
	reads: [sessionOperation, session],
	emits: operationRetried,
	rejections: { Unavailable: { message: Schema.String } },
	run: Effect.fn("Sessions.retry")(function* (input, rows, reject) {
		const held = yield* rows.sessionOperation.find(input.id);
		if (Option.isNone(held) || held.value.status !== "waiting")
			return yield* reject.Unavailable({ message: "The operation is not waiting for retry" });
		const root = yield* rows.session.find(held.value.sessionId);
		if (Option.isNone(root) || root.value.status !== "open") return yield* reject.Unavailable({ message: "The session has ended" });
		return {
			previousId: input.id,
			operation: { ...held.value, id: SessionOperationId.make(input.requestId), status: "requested" as const, detail: null },
		};
	}),
});
export const operationRetriedMaterializer = materializer(operationRetried, {
	writes: [sessionOperation],
	run: Effect.fn("Sessions.operationRetried")(function* (fact, rows) {
		yield* rows.sessionOperation.update(fact.previousId, { status: "cancelled" });
		yield* rows.sessionOperation.insert({ ...fact.operation, requestedAt: new Date(fact.at).toISOString() });
	}),
});
