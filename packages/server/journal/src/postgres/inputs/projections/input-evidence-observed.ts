import type { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/inputs/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectInputEvidenceObserved = (rows: Rows) =>
	Effect.fn("InputsHistory.projectInputEvidenceObserved")(function* (
		fact: Extract<typeof InputsEvent.Type, { readonly _tag: "InputEvidenceObserved" }>,
	) {
		for (const current of yield* rows.session.where({})) yield* rows.session.delete(current.id);
		for (const current of yield* rows.sessionOperation.where({})) yield* rows.sessionOperation.delete(current.id);
		for (const current of yield* rows.capacity.where({})) yield* rows.capacity.delete(current.backend);
		for (const session of fact.sessions) yield* rows.session.insert(session);
		for (const operation of fact.operations) yield* rows.sessionOperation.insert(operation);
		for (const capacity of fact.capacities) yield* rows.capacity.insert(capacity);
	});
