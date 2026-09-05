import { Deferred, Effect } from "effect";
import type { KernelReachService } from "#kernel-reach/installed.ts";

export const makeQueueSiesta = (installed: Deferred.Deferred<KernelReachService>) =>
	Effect.fn("KernelReach.queueSiesta")(function* (sessionId: string) {
		const reach = yield* Deferred.await(installed);
		return yield* reach.queueSiesta(sessionId);
	});
