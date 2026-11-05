import type * as Source from "@antumbra/domain-repos/queries/by-id.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";

export const byId = Effect.fn("repos.byId")(function* (
	input: Schema.Struct.Type<typeof Source.byId.input>,
): Effect.fn.Return<typeof Source.byId.output.Type, never, Records> {
	const rows = yield* Records;

	return Option.getOrNull(
		yield* rows.repo
			.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection })
			.pipe(Effect.orDie),
	);
});
