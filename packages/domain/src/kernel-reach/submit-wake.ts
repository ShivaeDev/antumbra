import type { WakeFields } from "@antumbra/sessions";
import { Deferred, Effect } from "effect";
import type { KernelReachService } from "#kernel-reach/installed.ts";

export const makeSubmitWake = (installed: Deferred.Deferred<KernelReachService>) =>
	Effect.fn("KernelReach.submitWake")(function* (payload: WakeFields) {
		const reach = yield* Deferred.await(installed);
		return yield* reach.submitWake(payload);
	});
