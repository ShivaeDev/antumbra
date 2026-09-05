import type { ObserveCadenceOptions } from "@antumbra/changes/watch/cadence";
import { ChangeWatcherLive as WatchChangesLive } from "@antumbra/changes/watch/live";
import { Effect, Layer } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";

export const ChangeWatcherLive = (overrides: Partial<ObserveCadenceOptions> = {}) =>
	Layer.unwrap(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			return WatchChangesLive(domain.changes.hostTags, overrides);
		}),
	);
