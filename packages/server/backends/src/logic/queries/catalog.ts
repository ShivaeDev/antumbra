import type * as Source from "@antumbra/domain-backends/queries/catalog.ts";
import { selection as backendCatalogSelection } from "@antumbra/server-storage/records/backend-catalog.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import type { Schema } from "effect";
import { Effect, Option } from "effect";

export const catalog = Effect.fn("backends.catalog")(function* (
	input: Schema.Struct.Type<typeof Source.catalog.input>,
): Effect.fn.Return<typeof Source.catalog.output.Type, never, Records> {
	const rows = yield* Records;

	const listed = yield* rows.backendCatalog
		.findOne({ where: { backend: input.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: backendCatalogSelection })
		.pipe(Effect.orDie);
	return Option.isNone(listed) ? { backend: input.backend, failure: null, imageInput: null } : listed.value;
});
