import { Effect } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import type { initialize } from "#backend-capacity-releases/initialize.ts";

export const release = (reconcile: Effect.Success<typeof initialize>) =>
	Effect.fn("BackendCapacityReleases.release")(function* (backend: string) {
		const domain = yield* AgentDomain;
		yield* domain.backendCapacities.clear(backend);
		yield* reconcile;
		yield* domain.backendCapacities.announce();
	});
