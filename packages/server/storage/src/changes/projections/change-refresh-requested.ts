import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeRefreshRequested = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeRefreshRequested")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeRefreshRequested" }>,
	) {
		if (
			yield* rows.changeRefresh.count({ where: { id: "changes" } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* rows.changeRefresh.updateVoid({ ...{ request: fact.request }, id: "changes" }).pipe(Effect.orDie);
		else yield* rows.changeRefresh.insertVoid({ id: "changes", request: fact.request }).pipe(Effect.orDie);
	});
