import type { changeArchived } from "@antumbra/domain-changes/facts/change-archived.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const changeArchivedMaterializer = Effect.fn("changes.changeArchived")(function* (
	fact: FactValue<typeof changeArchived>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.change.updateVoid({ ...{ archivedAt: new Date(fact.at).toISOString() }, id: fact.changeId }).pipe(Effect.orDie);
});
