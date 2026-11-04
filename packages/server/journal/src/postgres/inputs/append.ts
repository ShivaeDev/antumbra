import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { Effect, Schema } from "effect";
import { backendCatalog } from "#postgres/backends/rows.ts";
import { ExecutionHistory } from "#postgres/execution/service.ts";
import { capacity, session, sessionInput, sessionOperation } from "#postgres/inputs/rows.ts";

export const append = Effect.fn("InputsHistory.append")(function* (requestId: Request, events: readonly (typeof InputsEvent.Type)[]) {
	const history = yield* ExecutionHistory;
	const current = yield* history.read();
	let sequence = current.at(-1)?.value.sequence ?? 0;
	const stamped = events.map((event) => ({ ...event, sequence: ++sequence }));
	yield* history.append(requestId, stamped);
	return sequence;
});
export const read = Effect.fn("InputsHistory.read")(function* () {
	const history = yield* ExecutionHistory;
	const events = (yield* history.read()).filter((event) =>
		["InputRecorded", "InputDeliveryChanged", "InputDeliveryObserved", "InputRetried"].includes(event.value._tag),
	);
	return yield* Effect.forEach(events, (event) =>
		Schema.decodeUnknownEffect(InputsEvent)(event.value).pipe(Effect.map((value) => ({ ...event, value }))),
	);
});
export const checkRequest = Effect.fn("InputsHistory.checkRequest")(function* (requestId: Request) {
	const history = yield* ExecutionHistory;
	const done = (yield* history.read()).findLast((event) => event.requestId === requestId);
	if (done !== undefined) return yield* Effect.fail(new AlreadyDone({ requestId, seq: done.value.sequence }));
});
export const readRows = Effect.fn("InputsHistory.rows")(function* () {
	return yield* (yield* ExecutionHistory).rowsFor([sessionInput, session, sessionOperation, capacity, backendCatalog]);
});
export const rebuild = Effect.fn("InputsHistory.rebuild")(function* () {
	yield* (yield* ExecutionHistory).rebuild();
});
