import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { BackendsEvent } from "@antumbra/platform-vocabulary/backends-event.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { History } from "#backends/initialize.ts";
import { checkRequest as receipt } from "#receipt.ts";
export const append = (history: History) =>
	Effect.fn("BackendsHistory.append")(function* (requestId: Request, events: readonly (typeof BackendsEvent.Type)[]) {
		const current = yield* history.store.read("backends");
		return yield* history.store
			.append({ stream: "backends", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});
export const read = (history: History) =>
	Effect.fn("BackendsHistory.read")(function* () {
		return yield* history.store.read("backends");
	});
export const rebuild = (history: History) =>
	Effect.fn("BackendsHistory.rebuild")(function* () {
		yield* history.store.rebuild;
	});

export const readRows = (history: History) => Effect.fn("BackendsHistory.rows")(() => Effect.succeed(history.rows));
export const checkRequest = receipt("backends");
