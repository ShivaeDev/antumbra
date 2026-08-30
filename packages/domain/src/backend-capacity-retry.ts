import { Effect } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { BackendCapacityReleases } from "#backend-capacity-release.ts";
import { UnknownBackendTag } from "#errors.ts";

// why: clearing a provider hold is one deliberate fleet act. The release
// reconciler then queues only births and wakes still carrying that provider's
// exact hold detail; unrelated waits retain their own intervention boundary.
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
