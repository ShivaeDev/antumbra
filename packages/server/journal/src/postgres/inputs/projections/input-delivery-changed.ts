import type { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/inputs/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectInputDeliveryChanged = (rows: Rows) =>
	Effect.fn("InputsHistory.projectInputDeliveryChanged")(function* (
		fact: Extract<typeof InputsEvent.Type, { readonly _tag: "InputDeliveryChanged" }>,
	) {
		yield* rows.sessionInput.update(fact.id, { status: fact.status, detail: fact.detail });
	});
