import type * as Source from "@antumbra/domain-repos/queries/by-ids.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";

export const byIds = Effect.fn("repos.byIds")(function* (
	input: Schema.Struct.Type<typeof Source.byIds.input>,
): Effect.fn.Return<typeof Source.byIds.output.Type, never, Records> {
	const rows = yield* Records;

	const ids = new Set(input.ids);
	return (yield* rows.repo.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection }).pipe(Effect.orDie))
		.filter((stored) => ids.has(stored.id))
		.toSorted((left, right) => left.createdAt.localeCompare(right.createdAt));
});
