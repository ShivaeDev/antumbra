import type { capabilityObserved } from "@antumbra/domain-backends/facts/capability-observed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as backendCatalogSelection } from "@antumbra/server-storage/records/backend-catalog.ts";
import { Effect, Option } from "effect";
import { Records } from "#records.ts";

export const capabilityObservedMaterializer = Effect.fn("backends.CapabilityObserved")(function* (
	fact: FactValue<typeof capabilityObserved>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const known = yield* rows.backendCatalog
		.findOne({ where: { backend: fact.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: backendCatalogSelection })
		.pipe(Effect.orDie);
	if (Option.isSome(known)) yield* rows.backendCatalog.updateVoid({ ...{ imageInput: fact.imageInput }, backend: fact.backend }).pipe(Effect.orDie);
	else yield* rows.backendCatalog.insertVoid({ backend: fact.backend, imageInput: fact.imageInput, failure: null }).pipe(Effect.orDie);
});
