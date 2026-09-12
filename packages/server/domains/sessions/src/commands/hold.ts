import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { SessionOperationId } from "#ids.ts";
import { sessionOperation } from "#rows/session-operation.ts";
export const operationHeld = fact("SessionOperationHeld", { id: SessionOperationId, detail: Schema.String });
export const hold = command("hold", {
	input: { id: SessionOperationId, detail: Schema.String },
	reads: [sessionOperation],
	emits: operationHeld,
	rejections: {},
	run: Effect.fn("sessions.hold")(function* (input, rows) {
		yield* rows.sessionOperation.get(input.id);
		return { id: input.id, detail: input.detail };
	}),
});
export const operationHeldMaterializer = materializer(operationHeld, {
	writes: [sessionOperation],
	run: Effect.fn("sessions.operationHeld")(function* (fact, rows) {
		yield* rows.sessionOperation.update(fact.id, { status: "waiting", detail: fact.detail });
	}),
});
