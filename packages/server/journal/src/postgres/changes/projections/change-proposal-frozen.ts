import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";
import { storeChange } from "#postgres/changes/store.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeProposalFrozen = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeProposalFrozen")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeProposalFrozen" }>,
	) {
		yield* storeChange(rows, fact.change);
	});
