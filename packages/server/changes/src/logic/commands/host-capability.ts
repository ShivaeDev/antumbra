import type * as Source from "@antumbra/domain-changes/commands/host-capability.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { HostCapability } from "@antumbra/platform-vocabulary/changes.ts";
import { ChangeHostCapabilityObservedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { selection as changeHostCapabilitySelection } from "@antumbra/server-storage/records/change-host-capability.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const hostCapability = row("changeHostCapability", HostCapability.fields, { key: "host" });
export const hostCapabilityObserved = fact("ChangeHostCapabilityObserved", ChangeHostCapabilityObservedPayload.fields, { subject: "host" });
export const observeHostCapability = (input: typeof Source.observeHostCapability.Input.Type) =>
	Effect.succeed({ host: input.host, available: input.available, detail: input.detail });
export const hostCapabilities = Effect.fn("changes.hostCapabilities")(function* (
	_input: Schema.Struct.Type<typeof Source.hostCapabilities.input>,
): Effect.fn.Return<typeof Source.hostCapabilities.output.Type, never, Records> {
	const rows = yield* Records;

	return yield* rows.changeHostCapability
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: changeHostCapabilitySelection })
		.pipe(Effect.orDie);
});
