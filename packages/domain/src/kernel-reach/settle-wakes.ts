import { Deferred, Effect } from "effect";
import type { KernelReachService } from "#kernel-reach/installed.ts";

export const makeSettleWakes = (installed: Deferred.Deferred<KernelReachService>) =>
	Effect.fn("KernelReach.settleWakes")(function* (sessionId: string) {
		const reach = yield* Deferred.await(installed);
		return yield* reach.settleWakes(sessionId);
	});
