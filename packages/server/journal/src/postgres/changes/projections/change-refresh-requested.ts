import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeRefreshRequested = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeRefreshRequested")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeRefreshRequested" }>,
	) {
		if (yield* rows.changeRefresh.exists("changes")) yield* rows.changeRefresh.update("changes", { request: fact.request });
		else yield* rows.changeRefresh.insert({ id: "changes", request: fact.request });
	});
