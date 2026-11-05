import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeAdoptionFailed = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeAdoptionFailed")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeAdoptionFailed" }>,
	) {
		if (fact.id !== null) yield* rows.changeAdoptionRequest.updateVoid({ ...{ error: fact.message }, id: fact.id }).pipe(Effect.orDie);
	});
