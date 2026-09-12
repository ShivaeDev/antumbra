import { ChangeHostRefused, ChangeHosts, ChangeHostUnavailable } from "@antumbra/platform-change-host/port.ts";
import type { HostRepo } from "@antumbra/platform-vocabulary/change-host.ts";
import { Effect } from "effect";
export const claimingHost = Effect.fn("changes.claimingHost")(function* (repo: HostRepo, tag?: string) {
	const hosts = yield* ChangeHosts;
	const host = hosts.find((host) => (tag === undefined ? host.supports(repo) : host.tag === tag));
	if (host === undefined)
		return yield* new ChangeHostRefused({ host: tag ?? "unknown", detail: "No registered change host supports this repository" });
	const capability = yield* host.capability;
	if (!capability.available) return yield* new ChangeHostUnavailable({ host: host.tag, detail: capability.detail });
	return host;
});
