import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { Effect } from "effect";
import type { backendCatalog } from "#postgres/backends/rows.ts";
import type { History } from "#postgres/inputs/initialize.ts";
import type { capacity, session, sessionInput, sessionOperation } from "#postgres/inputs/rows.ts";
import { checkRequest as receipt } from "#postgres/receipt.ts";
export const append = (history: History) =>
	Effect.fn("InputsHistory.append")(function* (requestId: Request, events: readonly (typeof InputsEvent.Type)[]) {
		const current = yield* history.store.read("inputs");
		return yield* history.store
			.append({ stream: "inputs", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});
export const read = (history: History) =>
	Effect.fn("InputsHistory.read")(function* () {
		return yield* history.store.read("inputs");
	});
export const rebuild = (history: History) =>
	Effect.fn("InputsHistory.rebuild")(function* () {
		yield* history.store.rebuild;
	});

export const readRows = (history: History) =>
	Effect.fn("InputsHistory.rows")(() =>
		Effect.succeed<ReadHandles<readonly [typeof sessionInput, typeof session, typeof sessionOperation, typeof capacity, typeof backendCatalog]>>(
			history.rows,
		),
	);
export const checkRequest = receipt("inputs");
