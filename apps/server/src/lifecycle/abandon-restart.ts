import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Lifecycle } from "@antumbra/server-lifecycle/service.ts";
import { Effect } from "effect";

export const abandonRestart = Effect.fn("Lifecycle.abandonRestart")(function* ({ requestId }: { readonly requestId: string }) {
	const lifecycleService = yield* Lifecycle;

	yield* lifecycleService.clear({ requestId: Request.make(requestId) }).pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});
