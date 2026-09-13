import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { changeArchived } from "#facts/change-archived.ts";
import { change } from "#rows/change.ts";
export const changeArchivedMaterializer = materializer(changeArchived, {
	writes: [change],
	run: Effect.fn("changes.changeArchived")(function* (fact, rows) {
		yield* rows.change.update(fact.changeId, { archivedAt: new Date(fact.at).toISOString() });
	}),
});
