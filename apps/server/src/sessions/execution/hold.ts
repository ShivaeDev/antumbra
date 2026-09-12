import { hold } from "@antumbra/domain-sessions/commands/hold.ts";
import type { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
export const holdOperation = Effect.fn("Sessions.holdOperation")(function* (id: SessionOperationId, detail: string) {
	const commit = yield* Commit;
	yield* commit.commit(hold, { requestId: Request.make(`${id}:held`), id, detail }).pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});
