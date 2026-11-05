import type * as Source from "@antumbra/domain-repos/queries/all.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const all = Effect.fn("repos.all")(function* (
	_input: Schema.Struct.Type<typeof Source.all.input>,
): Effect.fn.Return<typeof Source.all.output.Type, never, Records> {
	const rows = yield* Records;

	return (yield* rows.repo
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection })
		.pipe(Effect.orDie)).toSorted((left, right) => left.createdAt.localeCompare(right.createdAt));
});
