import type * as Source from "@antumbra/domain-changes/queries/archivable.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { selection as changeSelection } from "@antumbra/server-storage/records/change.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

const Archivable = Schema.Struct({ id: ChangeId, landedAt: Schema.String });

export const archivable = Effect.fn("changes.archivable")(function* (
	_input: Schema.Struct.Type<typeof Source.archivable.input>,
): Effect.fn.Return<typeof Source.archivable.output.Type, never, Records> {
	const rows = yield* Records;

	const settled: (typeof Archivable.Type)[] = [];
	for (const held of yield* rows.change
		.findMany({ where: { archivedAt: null }, orderBy: { field: "storage_order", direction: "asc" }, select: changeSelection })
		.pipe(Effect.orDie)) {
		const landed = held.landedAt ?? held.withdrawnAt;
		if (landed !== null) settled.push({ id: held.id, landedAt: landed });
	}
	return settled;
});
