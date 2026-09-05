import { Effect } from "effect";
import { BackendCapacityReleases } from "#backend-capacity-releases/service.ts";
import { BackendCatalog } from "#backend-catalog/service.ts";
import { UnknownBackendTag } from "#errors.ts";

export const makeRetryBackendCapacity = Effect.gen(function* () {
	const catalog = yield* BackendCatalog;
	const { backends } = yield* catalog.snapshot();
	const releases = yield* BackendCapacityReleases;
	return (backend: string) =>
		Effect.gen(function* () {
			if (!backends.includes(backend)) {
				return yield* new UnknownBackendTag({ tag: backend });
			}
			yield* releases.release(backend);
		});
});
