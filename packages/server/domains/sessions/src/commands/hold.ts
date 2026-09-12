import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { SessionOperationId } from "#ids.ts";
import { sessionCapacityWait } from "#rows/session-capacity-wait.ts";
import { sessionOperation } from "#rows/session-operation.ts";

export const operationHeld = fact("SessionOperationHeld", { id: SessionOperationId, detail: Schema.String, backend: Schema.NullOr(Schema.String) });
export const hold = command("hold", {
	input: { id: SessionOperationId, detail: Schema.String },
	reads: [sessionOperation],
	emits: operationHeld,
	rejections: {},
	run: Effect.fn("Sessions.hold")(function* (input, rows) {
		yield* rows.sessionOperation.get(input.id);
		return { id: input.id, detail: input.detail, backend: null };
	}),
});
export const holdCapacity = command("holdCapacity", {
	input: { id: SessionOperationId, detail: Schema.String, backend: Schema.String },
	reads: [sessionOperation],
	emits: operationHeld,
	rejections: {},
	run: Effect.fn("Sessions.holdCapacity")(function* (input, rows) {
		yield* rows.sessionOperation.get(input.id);
		return { id: input.id, detail: input.detail, backend: input.backend };
	}),
});
export const operationHeldMaterializer = materializer(operationHeld, {
	writes: [sessionOperation, sessionCapacityWait],
	run: Effect.fn("Sessions.operationHeld")(function* (fact, rows) {
		yield* rows.sessionOperation.update(fact.id, { status: "waiting", detail: fact.detail });
		if (fact.backend !== null) yield* rows.sessionCapacityWait.insert({ id: fact.id, backend: fact.backend });
	}),
});
