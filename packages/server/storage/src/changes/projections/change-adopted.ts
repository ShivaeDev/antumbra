import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#changes/rows.ts";
import { storeChange, storeLink, storeTransition } from "#changes/store.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeAdopted = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeAdopted")(function* (fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeAdopted" }>) {
		yield* storeChange(fact.change);
		yield* storeLink(fact.link);
		yield* storeTransition(fact.transition);
		if (fact.adoptionId !== null) yield* rows.changeAdoptionRequest.delete(fact.adoptionId).pipe(Effect.orDie);
	});
