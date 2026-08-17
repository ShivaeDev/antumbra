import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { Deferred, Effect, Layer, Option } from "effect";
import { AGENTS_ALIVE_GAUGE, AgentDomain } from "#agent-domain-service.ts";
import { sweepBerths } from "#berth-sweep.ts";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { makeChangeProcedureCompiler } from "#change-procedures.ts";
import { makeCrewToolCompiler } from "#crew-tools.ts";
import type { AgentDeps, KernelReach } from "#deps.ts";
import { domainCapabilities } from "#domain-capabilities.ts";
import { makeEventSinkFactory } from "#events.ts";
import { SessionFabric, SessionFabricLive } from "#fabric.ts";
import { makeRepoRegistry } from "#registry.ts";
import { makeRetireKind } from "#retire.ts";
import { makeRecoveryKind } from "#session-recovery.ts";
import type { SessionRecoveryContext } from "#session-recovery-context.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";
import { makeSessionRecoveryRuntime } from "#session-resume.ts";
import { makeSiestaKind } from "#session-siesta.ts";
import { makeSpawnKind } from "#spawn.ts";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";
import { makeVoyageProcedures } from "#voyages.ts";

export { AGENTS_ALIVE_GAUGE, AgentDomain } from "#agent-domain-service.ts";

// why: built before the kernel starts — the boot sweep must settle stranded
// agents before admission can pull anything that reads their state.
export const AgentDomainLive = (
	backends: ReadonlyMap<string, AgentBackend>,
	runners: ReadonlyMap<string, Runner>,
	changeHosts: ReadonlyMap<string, ChangeHost>,
	artifactsDirectory: string,
) => {
	const capabilities = domainCapabilities(
		changeHosts,
		runners,
		artifactsDirectory,
	);
	return Layer.effect(AgentDomain)(
		Effect.gen(function* () {
			const boards = yield* Boards;
			const db = yield* Database;
			const writer = yield* Writer;
			const executors = yield* Effect.context<WriteExecutors>();
			const fabric = yield* SessionFabric;
			const feeds = yield* DomainFeeds;
			const sinkFor = yield* makeEventSinkFactory(feeds.events);
			const kernelReach = yield* Deferred.make<KernelReach>();
			const deps: AgentDeps = {
				backends,
				changeHosts,
				db,
				executors,
				fabric,
				feeds,
				kernelReach,
				runners,
				sinkFor,
				writer,
			};
			const makeSpawn = yield* makeSpawnKind;
			const makeChanges = yield* makeChangeProcedureCompiler;
			const compileCaptainTools = yield* makeCaptainToolCompiler;
			const compileCrewTools = yield* makeCrewToolCompiler;
			const spawn = makeSpawn(deps);
			const toolsFor = (context: SessionRecoveryContext) =>
				context.role === CAPTAIN_ROLE &&
				Option.isSome(context.identity.voyageId)
					? compileCaptainTools(deps, context.identity)
					: compileCrewTools(deps, context.identity);
			const recoveryRuntime = yield* makeSessionRecoveryRuntime({
				backends,
				sinkFor,
				toolsFor,
			});
			const recover = yield* makeRecoveryKind.pipe(
				Effect.provideService(SessionRecoveryRuntime, recoveryRuntime),
			);
			yield* sweepBerths(runners);
			const aliveAgents = db.Agent.where({ status: "alive" })
				.all()
				.pipe(
					Effect.map((agents) => agents.length),
					Effect.provideContext(executors),
					Effect.orDie,
				);
			const makeVoyages = yield* makeVoyageProcedures;
			const retire = makeRetireKind(deps);
			const siesta = yield* makeSiestaKind;
			return {
				backends: [...backends.keys()],
				boards,
				changes: makeChanges(deps),
				gauges: { [AGENTS_ALIVE_GAUGE]: aliveAgents },
				interruptSession: fabric.interrupt,
				kernelReach,
				kinds: [spawn, recover, retire, siesta],
				repos: makeRepoRegistry(deps),
				recover,
				retire,
				siesta,
				spawn,
				voyages: makeVoyages(deps),
			};
		}),
	).pipe(Layer.provide(SessionFabricLive), Layer.provideMerge(capabilities));
};
