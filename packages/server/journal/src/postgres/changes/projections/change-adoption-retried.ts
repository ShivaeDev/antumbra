import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeAdoptionRetried = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeAdoptionRetried")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeAdoptionRetried" }>,
	) {
		yield* rows.changeAdoptionRequest.update(fact.id, { url: fact.url, error: null });
	});
