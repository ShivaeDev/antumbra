import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { HostCapability } from "@antumbra/platform-vocabulary/changes.ts";
import { ChangeHostCapabilityObservedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { selection as changeHostCapabilitySelection } from "@antumbra/server-storage/records/change-host-capability.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const hostCapability = row("changeHostCapability", HostCapability.fields, { key: "host" });
export const hostCapabilityObserved = fact("ChangeHostCapabilityObserved", ChangeHostCapabilityObservedPayload.fields, { subject: "host" });
export const hostCapabilityMaterializer = Effect.fn("changes.hostCapability")(function* (
	fact: FactValue<typeof hostCapabilityObserved>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const held = (yield* rows.changeHostCapability
		.findMany({ where: { host: fact.host }, orderBy: { field: "storage_order", direction: "asc" }, select: changeHostCapabilitySelection })
		.pipe(Effect.orDie))[0];
	if (held === undefined) yield* rows.changeHostCapability.insertVoid(fact).pipe(Effect.orDie);
	else if (held.available !== fact.available || held.detail !== fact.detail)
		yield* rows.changeHostCapability.updateVoid({ ...{ available: fact.available, detail: fact.detail }, host: fact.host }).pipe(Effect.orDie);
});
