import type * as Source from "@antumbra/domain-backends/queries/efforts.ts";
import { backendModelId } from "@antumbra/platform-vocabulary/backends-ids.ts";
import { selection as backendModelSelection } from "@antumbra/server-storage/records/backend-model.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";

export const efforts = Effect.fn("backends.efforts")(function* (
	input: Schema.Struct.Type<typeof Source.efforts.input>,
): Effect.fn.Return<typeof Source.efforts.output.Type, never, Records> {
	const rows = yield* Records;

	const offered = yield* rows.backendModel
		.findOne({
			where: { id: backendModelId(input.backend, input.model) },
			orderBy: { field: "storage_order", direction: "asc" },
			select: backendModelSelection,
		})
		.pipe(Effect.orDie);
	return Option.isNone(offered) ? [] : offered.value.efforts;
});
