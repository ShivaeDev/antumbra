import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangePublicationFailed = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangePublicationFailed")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangePublicationFailed" }>,
	) {
		if (fact.change !== null) yield* rows.change.updateVoid({ ...fact.change, id: fact.change.id }).pipe(Effect.orDie);
	});
