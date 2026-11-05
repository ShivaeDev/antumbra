import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { BoardsEvent } from "@antumbra/platform-vocabulary/boards-event.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { History } from "#boards/initialize.ts";
import { checkRequest as receipt } from "#receipt.ts";
export const append = (history: History) =>
	Effect.fn("BoardsHistory.append")(function* (requestId: Request, events: readonly (typeof BoardsEvent.Type)[]) {
		const current = yield* history.store.read("boards");
		return yield* history.store
			.append({ stream: "boards", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});
export const read = (history: History) =>
	Effect.fn("BoardsHistory.read")(function* () {
		return yield* history.store.read("boards");
	});
export const rebuild = (history: History) =>
	Effect.fn("BoardsHistory.rebuild")(function* () {
		yield* history.store.rebuild;
	});

export const readRows = (history: History) => Effect.fn("BoardsHistory.rows")(() => Effect.succeed(history.rows));
export const checkRequest = receipt("boards");
