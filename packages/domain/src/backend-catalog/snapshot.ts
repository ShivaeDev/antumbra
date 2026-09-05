import { Effect } from "effect";
import { BackendProviders } from "#backend-catalog/providers.ts";
import { imageInputBackendsOf } from "#image-input-backends.ts";

interface BackendSnapshot {
	readonly backends: ReadonlyArray<string>;
	readonly imageInputBackends: ReadonlySet<string>;
}

export const snapshot = Effect.fn("BackendCatalog.snapshot")(function* (): Effect.fn.Return<BackendSnapshot, never, BackendProviders> {
	const backends = yield* BackendProviders;
	return { backends: [...backends.keys()], imageInputBackends: imageInputBackendsOf(backends) };
});
