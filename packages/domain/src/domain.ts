import type { AnyIntentKind, IntentKind } from "@antumbra/kernel";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type {
	AgentBackend,
	BackendFailure,
	Runner,
} from "@antumbra/plugin-api";
import { Context, Effect, Layer } from "effect";
import { sweepBerths } from "#berth-sweep.ts";
import type { AgentDeps } from "#deps.ts";
import type { SessionNotLive } from "#errors.ts";
import { makeEventSinkFactory } from "#events.ts";
import { makeSessionFabric } from "#fabric.ts";
import { type DomainFeeds, makeDomainFeeds } from "#feeds.ts";
import { reclaimAgents } from "#reclaim.ts";
import { makeRepoRegistry, type RepoRegistry } from "#registry.ts";
import { makeRetireKind, type RetireFields } from "#retire.ts";
import { makeSpawnKind, type SpawnFields } from "#spawn.ts";
import { makeVoyageProcedures, type VoyageProcedures } from "#voyages.ts";

// why: exposed but not installed as a gate — kernel gates are global, so a
// birth ceiling would block retire alongside spawn. Installing it waits for
// kind-scoped gate policies.
export const AGENTS_ALIVE_GAUGE = "agents.alive";

export class AgentDomain extends Context.Service<
	AgentDomain,
	{
		readonly backends: ReadonlyArray<string>;
		readonly feeds: DomainFeeds;
		readonly gauges: Readonly<Record<string, Effect.Effect<number>>>;
		readonly interruptSession: (
			sessionId: string,
		) => Effect.Effect<void, BackendFailure | SessionNotLive>;
		readonly kinds: ReadonlyArray<AnyIntentKind>;
		readonly repos: RepoRegistry;
		readonly retire: IntentKind<RetireFields>;
		readonly spawn: IntentKind<SpawnFields>;
		readonly voyages: VoyageProcedures;
	}
>()("@antumbra/domain/AgentDomain") {}

// why: built before the kernel starts — the boot sweep must settle stranded
// agents before admission can pull anything that reads their state.
export const AgentDomainLive = (
	backends: ReadonlyMap<string, AgentBackend>,
	runners: ReadonlyMap<string, Runner>,
) =>
	Layer.effect(AgentDomain)(
		Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			const executors = yield* Effect.context<WriteExecutors>();
			const fabric = yield* makeSessionFabric;
			const feeds = yield* makeDomainFeeds;
			const sinkFor = yield* makeEventSinkFactory(feeds.events);
			yield* reclaimAgents;
			yield* sweepBerths(runners);
			const deps: AgentDeps = {
				backends,
				db,
				executors,
				fabric,
				feeds,
				runners,
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
				backends: [...backends.keys()],
				feeds,
				gauges: { [AGENTS_ALIVE_GAUGE]: aliveAgents },
				interruptSession: fabric.interrupt,
				kinds: [spawn, retire],
				repos: makeRepoRegistry(deps),
				retire,
				spawn,
				voyages: makeVoyageProcedures(deps),
			};
		}),
	);
