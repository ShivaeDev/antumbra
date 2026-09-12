import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Option } from "effect";
import { capabilityObserved } from "#facts/capability-observed.ts";
import { backendCatalog } from "#rows/backend-catalog.ts";

export const capabilityObservedMaterializer = materializer(capabilityObserved, {
	writes: [backendCatalog],
	run: Effect.fn("backends.CapabilityObserved")(function* (fact, rows) {
		const known = yield* rows.backendCatalog.find(fact.backend);
		if (Option.isSome(known)) yield* rows.backendCatalog.update(fact.backend, { imageInput: fact.imageInput });
		else yield* rows.backendCatalog.insert({ backend: fact.backend, imageInput: fact.imageInput, failure: null });
	}),
});
