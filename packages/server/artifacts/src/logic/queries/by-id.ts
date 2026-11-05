import type * as Source from "@antumbra/domain-artifacts/queries/by-id.ts";
import { selection as artifactSelection } from "@antumbra/server-storage/records/artifact.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";
export const byId = Effect.fn("Artifacts.byId")(function* (
	input: Schema.Struct.Type<typeof Source.byId.input>,
): Effect.fn.Return<typeof Source.byId.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.artifact
			.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: artifactSelection })
			.pipe(Effect.orDie),
	);
});
