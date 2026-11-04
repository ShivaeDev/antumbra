import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";
import { storeChange, storeLink } from "#postgres/changes/store.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangePrepared = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangePrepared")(function* (fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangePrepared" }>) {
		yield* storeChange(rows, fact.change);
		yield* storeLink(rows, fact.link);
	});
