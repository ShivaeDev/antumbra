import { Boards } from "@antumbra/boards";
import { Database, type WriteExecutors } from "@antumbra/persistence";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { Repos } from "@antumbra/repos";
import {
	type ResourceReconcileOptions,
	ResourceReconciler,
	ResourceReconcilerLive,
} from "@antumbra/resource-reclamation";
import { SessionEventJournal } from "@antumbra/session-event-journal";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Layer } from "effect";
import { AGENTS_ALIVE_GAUGE, AgentDomain } from "#agent-domain-service.ts";
import { compileAgentRecoveryDemands } from "#agent-recovery-demands.ts";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { changeHeldResourceRead } from "#change-held-resource-read.ts";
import { ChangeProcedureService } from "#change-procedures.ts";
import { makeCrewToolCompiler } from "#crew-tools.ts";
import { makeCurrentSessionReconciler } from "#current-session-reconcile.ts";
import { domainCapabilities } from "#domain-capabilities.ts";
import { type EventSink, SessionFabric, SessionFabricLive } from "#fabric.ts";
import { makeRetireKind } from "#retire.ts";
import { makeRecoveryKind } from "#session-recovery.ts";
import type { SessionRecoveryContext } from "#session-recovery-context.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";
import { makeSessionRecoveryRuntime } from "#session-resume.ts";
import { makeSiestaKind } from "#session-siesta.ts";
import { spawnKind } from "#spawn.ts";
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
			const executors = yield* Effect.context<WriteExecutors>();
			const fabric = yield* SessionFabric;
			const journal = yield* SessionEventJournal;
			const sinkFor = (sessionId: string): Effect.Effect<EventSink> =>
				Effect.succeed((event) => journal.record(sessionId, event));
			const resourceReconciler = yield* ResourceReconciler;
			const voyages = yield* VoyageProcedureService;
			const reconcileCurrentSessions = yield* makeCurrentSessionReconciler;
			yield* reconcileCurrentSessions;
			const spawn = yield* spawnKind({ backends, runners, sinkFor });
			const retire = yield* makeRetireKind;
			const compileCaptainTools = yield* makeCaptainToolCompiler;
			const compileCrewTools = yield* makeCrewToolCompiler;
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
			const siesta = yield* makeSiestaKind;
			const intentDemands = yield* compileAgentRecoveryDemands(recover, siesta);
			return {
				backends: [...backends.keys()],
				boards,
				changes,
				closeSessionStarts: fabric.closeStarts,
				gauges: { [AGENTS_ALIVE_GAUGE]: aliveAgents },
				interruptSession: fabric.interrupt,
				intentDemands,
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
		Layer.provide(
			ResourceReconcilerLive(changeHeldResourceRead, runners, reclaimOptions),
		),
		Layer.provide(SessionFabricLive),
		Layer.provideMerge(capabilities),
	);
};
