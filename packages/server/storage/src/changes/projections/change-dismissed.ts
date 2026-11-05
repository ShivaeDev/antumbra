import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeDismissed = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeDismissed")(function* (fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeDismissed" }>) {
		if (
			!(yield* rows.changeVerdict.count({ where: { changeId: fact.changeId } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			))
		)
			yield* rows.changeVerdict
				.insertVoid({ changeId: fact.changeId, verdict: "dismissed", landedAt: new Date(fact.at).toISOString() })
				.pipe(Effect.orDie);
	});
