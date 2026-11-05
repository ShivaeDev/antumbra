import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { ReposEvent } from "@antumbra/platform-vocabulary/repos-event.ts";
import { Effect } from "effect";
import { checkRequest as receipt } from "#receipt.ts";
import type { History } from "#repos/initialize.ts";
export const append = (history: History) =>
	Effect.fn("ReposHistory.append")(function* (requestId: Request, events: readonly (typeof ReposEvent.Type)[]) {
		const current = yield* history.store.read("repos");
		return yield* history.store
			.append({ stream: "repos", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});
export const read = (history: History) =>
	Effect.fn("ReposHistory.read")(function* () {
		return yield* history.store.read("repos");
	});
export const rebuild = (history: History) =>
	Effect.fn("ReposHistory.rebuild")(function* () {
		yield* history.store.rebuild;
	});

export const readRows = (history: History) => Effect.fn("ReposHistory.rows")(() => Effect.succeed(history.rows));
export const checkRequest = receipt("repos");
