import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, PubSub } from "effect";
import {
	ChangeHosts,
	type ChangeProcedureRequirements,
} from "#change-procedure-requirements.ts";
import { type QuayReading, quayReading } from "#quay-view.ts";
import {
	type VoyageWorldReadFailure,
	VoyageWorldSource,
} from "#voyage-world.ts";

// why: what a host can do right now, said in the host's own words — the window
// shows it, and a tool that cannot act says the same sentence back to the
// agent, so both read the same answer rather than two paraphrases of it.
export interface ChangeHostCapabilityView {
	readonly available: boolean;
	readonly detail: string;
	readonly tag: string;
}

export const capabilities = Effect.fn("changeProcedures.capabilities")(
	function* (): ChangeProcedureRequirements<
		ReadonlyArray<ChangeHostCapabilityView>
	> {
		const hosts = yield* ChangeHosts;
		return yield* Effect.forEach([...hosts.values()], (host) =>
			Effect.map(host.capability, (capability) => ({
				available: capability.available,
				detail: capability.detail,
				tag: host.tag,
			})),
		);
	},
);

export const hostTags = Effect.fn("changeProcedures.hostTags")(
	function* (): ChangeProcedureRequirements<ReadonlyArray<string>> {
		return [...(yield* ChangeHosts).keys()];
	},
);

// why: every change still owed, read across the whole fleet and grouped by
// where it lies, beside the pieces one made by hand can be adopted onto.
export const quay = Effect.fn("changeProcedures.quay")(
	function* (): ChangeProcedureRequirements<
		QuayReading,
		VoyageWorldReadFailure
	> {
		return quayReading(yield* (yield* VoyageWorldSource).read);
	},
);

// why: the same ring an opened change gives, offered to whoever else wants
// to stop waiting — a window's refresh button, an agent that knows something
// happened. It asks; the cadence still decides what a pass costs.
export const requestRefresh = Effect.fn("changeProcedures.requestRefresh")(
	function* (): ChangeProcedureRequirements<void> {
		yield* PubSub.publish((yield* DomainFeeds).changeRefresh, undefined);
	},
);
