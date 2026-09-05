import { BackendCapacities } from "@antumbra/provider-capacity";
import { Effect } from "effect";
import type { initialize } from "#backend-capacity-releases/initialize.ts";

export const release = (reconcile: Effect.Success<typeof initialize>) =>
	Effect.fn("BackendCapacityReleases.release")(function* (backend: string) {
		const backendCapacities = yield* BackendCapacities;
		yield* backendCapacities.clear(backend);
		yield* reconcile;
		yield* backendCapacities.announce();
	});
