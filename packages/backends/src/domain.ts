import type { AnyIntentKind, IntentKind } from "@antumbra/kernel";
import {
	Database,
	Writer,
	type WriteExecutors,
} from "@antumbra/persistence";
import type { AgentBackend } from "@antumbra/plugin-api";
import { Context, Effect, Layer } from "effect";
import type { AgentDeps } from "#deps.ts";
import { makeEventSinkFactory } from "#events.ts";
import { makeSessionFabric } from "#fabric.ts";
import { reclaimAgents } from "#reclaim.ts";
import { makeRetireKind, type RetireFields } from "#retire.ts";
import { makeSpawnKind, type SpawnFields } from "#spawn.ts";

// why: exposed but not installed as a gate in v0 — kernel gates are global,
// so a birth ceiling would block retire alongside spawn. Installing it waits
// for kind-scoped policies in the pick seam.
export const AGENTS_ALIVE_GAUGE = "agents.alive";

export class AgentDomain extends Context.Service<
	AgentDomain,
	{
		readonly gauges: Readonly<Record<string, Effect.Effect<number>>>;
		readonly kinds: ReadonlyArray<AnyIntentKind>;
		readonly retire: IntentKind<RetireFields>;
		readonly spawn: IntentKind<SpawnFields>;
	}
>()("@antumbra/backends/AgentDomain") {}

// why: built before the kernel starts — the boot sweep must settle stranded
// agents before admission can pull anything that reads their state.
export const AgentDomainLive = (backends: ReadonlyMap<string, AgentBackend>) =>
	Layer.effect(AgentDomain)(
		Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			const executors = yield* Effect.context<WriteExecutors>();
			const fabric = yield* makeSessionFabric;
			const sinkFor = yield* makeEventSinkFactory;
			yield* reclaimAgents;
			const deps: AgentDeps = {
				backends,
				db,
				executors,
				fabric,
				sinkFor,
				writer,
			};
			const aliveAgents = db.Agent.where({ status: "alive" })
				.all()
				.pipe(
					Effect.map((agents) => agents.length),
					Effect.provideContext(executors),
					Effect.orDie,
				);
			const spawn = makeSpawnKind(deps);
			const retire = makeRetireKind(deps);
			return {
				gauges: { [AGENTS_ALIVE_GAUGE]: aliveAgents },
				kinds: [spawn, retire],
				retire,
				spawn,
			};
		}),
	);
