import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Effect, Schema } from "effect";
export const hostCapability = row("changeHostCapability", { host: Schema.String, available: Schema.Boolean, detail: Schema.String }, { key: "host" });
export const hostCapabilityObserved = fact("ChangeHostCapabilityObserved", hostCapability.fields, { subject: "host" });
export const observeHostCapability = command("observeHostCapability", {
	input: hostCapability.fields,
	reads: [],
	emits: hostCapabilityObserved,
	rejections: {},
	run: (input) => Effect.succeed({ host: input.host, available: input.available, detail: input.detail }),
});
export const hostCapabilityMaterializer = materializer(hostCapabilityObserved, {
	writes: [hostCapability],
	run: Effect.fn("changes.hostCapability")(function* (fact, rows) {
		const held = (yield* rows.changeHostCapability.where({ host: fact.host }))[0];
		if (held === undefined) yield* rows.changeHostCapability.insert(fact);
		else if (held.available !== fact.available || held.detail !== fact.detail)
			yield* rows.changeHostCapability.update(fact.host, { available: fact.available, detail: fact.detail });
	}),
});
export const hostCapabilities = query("hostCapabilities", {
	input: {},
	output: Schema.Array(hostCapability.Row),
	reads: [hostCapability],
	run: Effect.fn("changes.hostCapabilities")(function* (_input, rows) {
		return yield* rows.changeHostCapability.where({});
	}),
});
