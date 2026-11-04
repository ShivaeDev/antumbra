import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeArchived = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeArchived")(function* (fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeArchived" }>) {
		yield* rows.change.update(fact.changeId, { archivedAt: new Date(fact.at).toISOString() });
	});
