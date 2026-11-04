import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeHostCapabilityObserved = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeHostCapabilityObserved")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeHostCapabilityObserved" }>,
	) {
		const held = (yield* rows.changeHostCapability.where({ host: fact.host }))[0];
		if (held === undefined) yield* rows.changeHostCapability.insert(fact);
		else if (held.available !== fact.available || held.detail !== fact.detail)
			yield* rows.changeHostCapability.update(fact.host, { available: fact.available, detail: fact.detail });
	});
