import { Deferred, Effect } from "effect";
import type { KernelReachService } from "#kernel-reach/installed.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeSubmitSpawn = (installed: Deferred.Deferred<KernelReachService>) =>
	Effect.fn("KernelReach.submitSpawn")(function* (payload: SpawnFields) {
		const reach = yield* Deferred.await(installed);
		return yield* reach.submitSpawn(payload);
	});
