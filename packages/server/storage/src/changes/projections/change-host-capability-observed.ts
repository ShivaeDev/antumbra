import type { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { selection as changeHostCapabilitySelection } from "@antumbra/server-storage/records/change-host-capability.ts";
import { Effect } from "effect";
import type { rows } from "#changes/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const projectChangeHostCapabilityObserved = (rows: Rows) =>
	Effect.fn("ChangesHistory.projectChangeHostCapabilityObserved")(function* (
		fact: Extract<typeof ChangesEvent.Type, { readonly _tag: "ChangeHostCapabilityObserved" }>,
	) {
		const held = (yield* rows.changeHostCapability
			.findMany({ where: { host: fact.host }, orderBy: { field: "storage_order", direction: "asc" }, select: changeHostCapabilitySelection })
			.pipe(Effect.orDie))[0];
		if (held === undefined) yield* rows.changeHostCapability.insertVoid(fact).pipe(Effect.orDie);
		else if (held.available !== fact.available || held.detail !== fact.detail)
			yield* rows.changeHostCapability.updateVoid({ ...{ available: fact.available, detail: fact.detail }, host: fact.host }).pipe(Effect.orDie);
	});
