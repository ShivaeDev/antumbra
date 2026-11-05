import type * as Source from "@antumbra/domain-backends/queries/models.ts";
import { selection as backendModelSelection } from "@antumbra/server-storage/records/backend-model.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const models = Effect.fn("backends.models")(function* (
	input: Schema.Struct.Type<typeof Source.models.input>,
): Effect.fn.Return<typeof Source.models.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.backendModel
		.findMany({ where: { backend: input.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: backendModelSelection })
		.pipe(Effect.orDie);
});
