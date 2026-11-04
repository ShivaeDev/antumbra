import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeDismissed = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeDismissed")(function* (fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeDismissed" }>) {
		if (!(yield* rows.changeVerdict.exists(fact.changeId)))
			yield* rows.changeVerdict.insert({ changeId: fact.changeId, verdict: "dismissed", landedAt: new Date(fact.at).toISOString() });
	});
