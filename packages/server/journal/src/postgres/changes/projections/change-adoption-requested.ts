import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeAdoptionRequested = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeAdoptionRequested")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeAdoptionRequested" }>,
	) {
		yield* rows.changeAdoptionRequest.insert(fact);
	});
