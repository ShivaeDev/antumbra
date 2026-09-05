import { Effect } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { BackendCapacityReleases } from "#backend-capacity-releases/service.ts";
import { UnknownBackendTag } from "#errors.ts";

export const makeRetryBackendCapacity = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const releases = yield* BackendCapacityReleases;
	return (backend: string) =>
		Effect.gen(function* () {
			if (!domain.backends.includes(backend)) {
				return yield* new UnknownBackendTag({ tag: backend });
			}
			yield* releases.release(backend);
		});
});
