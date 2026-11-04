import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";
import { storeChange, storeLink, storeTransition } from "#postgres/changes/store.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeAdopted = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeAdopted")(function* (fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeAdopted" }>) {
		yield* storeChange(rows, fact.change);
		yield* storeLink(rows, fact.link);
		yield* storeTransition(rows, fact.transition);
		if (fact.adoptionId !== null) yield* rows.changeAdoptionRequest.delete(fact.adoptionId);
	});
