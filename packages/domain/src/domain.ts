import { decodeStoredAgentStatus } from "@antumbra/agent-runtime-vocabulary";
import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { Repos } from "@antumbra/repos";
import { Effect, Layer } from "effect";
import { AGENTS_ALIVE_GAUGE, AgentDomain } from "#agent-domain-service.ts";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { ChangeProcedureService } from "#change-procedures.ts";
import { makeCrewToolCompiler } from "#crew-tools.ts";
import type { AgentDeps } from "#deps.ts";
import { domainCapabilities } from "#domain-capabilities.ts";
import { makeEventSinkFactory } from "#events.ts";
import { SessionFabric, SessionFabricLive } from "#fabric.ts";
import {
	type ResourceReconcileOptions,
	ResourceReconciler,
	ResourceReconcilerLive,
} from "#resource-reconciler.ts";
import { makeRetireKind } from "#retire.ts";
import { makeRecoveryKind } from "#session-recovery.ts";
import type { SessionRecoveryContext } from "#session-recovery-context.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";
import { makeSessionRecoveryRuntime } from "#session-resume.ts";
import { makeSiestaKind } from "#session-siesta.ts";
import { makeSpawnKind } from "#spawn.ts";
import { isVoyageCaptainIdentity } from "#voyage-captain.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";

export { AGENTS_ALIVE_GAUGE, AgentDomain } from "#agent-domain-service.ts";

// why: built before the kernel starts — the first resource pass must resume
// durable claims before admission can authorize more work through them.
export const AgentDomainLive = (
	backends: ReadonlyMap<string, AgentBackend>,
	runners: ReadonlyMap<string, Runner>,
	changeHosts: ReadonlyMap<string, ChangeHost>,
	artifactsDirectory: string,
	reclaimOptions: Partial<ResourceReconcileOptions> = {},
) => {
	const capabilities = domainCapabilities(
		changeHosts,
		runners,
		artifactsDirectory,
	);
	return Layer.effect(AgentDomain)(
		Effect.gen(function* () {
			const boards = yield* Boards;
			const changes = yield* ChangeProcedureService;
			const repos = yield* Repos;
			const db = yield* Database;
			const writer = yield* Writer;
			const executors = yield* Effect.context<WriteExecutors>();
			const fabric = yield* SessionFabric;
			const feeds = yield* DomainFeeds;
			const sinkFor = yield* makeEventSinkFactory(feeds.events);
			const resourceReconciler = yield* ResourceReconciler;
			const voyages = yield* VoyageProcedureService;
			const deps: AgentDeps = {
				backends,
				changeHosts,
				db,
				executors,
				fabric,
				feeds,
				runners,
				sinkFor,
				writer,
			};
			const makeSpawn = yield* makeSpawnKind;
			const makeRetire = yield* makeRetireKind;
			const compileCaptainTools = yield* makeCaptainToolCompiler;
			const compileCrewTools = yield* makeCrewToolCompiler;
			const spawn = makeSpawn(deps);
			const toolsFor = (context: SessionRecoveryContext) =>
				isVoyageCaptainIdentity(context.role, context.identity)
					? compileCaptainTools(context.identity)
					: compileCrewTools(context.identity);
			const recoveryRuntime = yield* makeSessionRecoveryRuntime({
				backends,
				sinkFor,
				toolsFor,
			});
			const recover = yield* makeRecoveryKind.pipe(
				Effect.provideService(SessionRecoveryRuntime, recoveryRuntime),
			);
			const aliveAgents = db.Agent.all().pipe(
				Effect.flatMap((agents) =>
					Effect.forEach(agents, (agent) =>
						Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)),
					),
				),
				Effect.map(
					(statuses) => statuses.filter((status) => status === "alive").length,
				),
				Effect.provideContext(executors),
			);
			const retire = makeRetire(deps);
			const siesta = yield* makeSiestaKind;
			return {
				backends: [...backends.keys()],
				boards,
				changes,
				closeSessionStarts: fabric.closeStarts,
				gauges: { [AGENTS_ALIVE_GAUGE]: aliveAgents },
				interruptSession: fabric.interrupt,
				kinds: [spawn, recover, retire, siesta],
				repos,
				retryResourceReclaim: resourceReconciler.reconcile,
				recover,
				reopenSessionStarts: fabric.reopenStarts,
				retire,
				siesta,
				spawn,
				voyages,
			};
		}),
	).pipe(
		Layer.provide(ResourceReconcilerLive(runners, reclaimOptions)),
		Layer.provide(SessionFabricLive),
		Layer.provideMerge(capabilities),
	);
};
