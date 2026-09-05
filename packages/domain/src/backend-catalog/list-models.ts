import { BackendFailure } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { BackendProviders } from "#backend-catalog/providers.ts";

export const listModels = Effect.fn("BackendCatalog.listModels")(function* (tag: string) {
	const backends = yield* BackendProviders;
	const backend = backends.get(tag);
	if (backend === undefined) {
		return yield* new BackendFailure({ detail: `backend ${tag} is not registered`, tag });
	}
	return yield* backend.listModels;
});
