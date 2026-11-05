import type * as Source from "@antumbra/domain-changes/queries/world.ts";
import { selection as berthSelection } from "@antumbra/server-storage/records/berth.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const world = Effect.fn("changes.world")(function* (
	_input: Schema.Struct.Type<typeof Source.world.input>,
): Effect.fn.Return<typeof Source.world.output.Type, never, Records> {
	const rows = yield* Records;

	return {
		changes: yield* rows.change
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
			.pipe(Effect.orDie),
		repos: yield* rows.repo.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection }).pipe(Effect.orDie),
		berths: yield* rows.berth
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: berthSelection })
			.pipe(Effect.orDie),
	};
});
