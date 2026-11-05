import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { HostCapability } from "@antumbra/platform-vocabulary/changes.ts";
import { ChangeHostCapabilityObservedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Schema } from "effect";
export const hostCapability = row("changeHostCapability", HostCapability.fields, { key: "host" });
export const hostCapabilityObserved = fact("ChangeHostCapabilityObserved", ChangeHostCapabilityObservedPayload.fields, { subject: "host" });
export const observeHostCapability = command("observeHostCapability", {
	input: hostCapability.fields,
	reads: [],
	emits: hostCapabilityObserved,
	rejections: {},
});
export const hostCapabilities = query("hostCapabilities", {
	input: {},
	output: Schema.Array(hostCapability.Row),
	reads: [hostCapability],
});
