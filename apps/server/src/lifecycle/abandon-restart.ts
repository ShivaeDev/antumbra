import { clear } from "@antumbra/domain-lifecycle/commands/clear.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";

export const abandonRestart = Effect.fn("Lifecycle.abandonRestart")(function* ({ requestId }: { readonly requestId: string }) {
	const commit = yield* Commit;
	yield* commit.commit(clear, { requestId: Request.make(requestId) }).pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});
