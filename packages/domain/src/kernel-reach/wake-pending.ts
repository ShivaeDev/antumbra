import { Deferred, Effect } from "effect";
import type { KernelReachService } from "#kernel-reach/installed.ts";

export const makeWakePending = (installed: Deferred.Deferred<KernelReachService>) =>
	Effect.fn("KernelReach.wakePending")(function* (sessionId: string) {
		const reach = yield* Deferred.await(installed);
		return yield* reach.wakePending(sessionId);
	});
