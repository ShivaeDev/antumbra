import { Effect } from "effect";
import { ChangeHostRegistry } from "#registries.ts";

export const hostCapabilities = Effect.fn("Changes.hostCapabilities")(function* () {
	const hosts = yield* ChangeHostRegistry;
	return yield* Effect.forEach([...hosts.values()], (host) => Effect.map(host.capability, (capability) => ({ ...capability, tag: host.tag })));
});
