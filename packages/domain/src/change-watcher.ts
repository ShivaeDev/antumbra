import type { ObserveCadenceOptions } from "@antumbra/changes/watch/cadence";
import { ChangeWatcher as WatchChanges } from "@antumbra/changes/watch/observer";
import { Effect, Layer } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";

export const ChangeWatcher = (overrides: Partial<ObserveCadenceOptions> = {}) =>
	Layer.unwrap(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			return WatchChanges(domain.changes.hostTags, overrides);
		}),
	);
