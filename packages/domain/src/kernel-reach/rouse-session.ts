import type { WakeFields } from "@antumbra/sessions";
import { Deferred, Effect } from "effect";
import type { KernelReachService } from "#kernel-reach/installed.ts";

export const makeRouseSession = (installed: Deferred.Deferred<KernelReachService>) =>
	Effect.fn("KernelReach.rouseSession")(function* (payload: WakeFields) {
		const reach = yield* Deferred.await(installed);
		return yield* reach.rouseSession(payload);
	});
