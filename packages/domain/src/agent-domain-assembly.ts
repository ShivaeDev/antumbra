import { Boards } from "@antumbra/boards";
import type { AgentBackend, Runner } from "@antumbra/plugin-api";
import { Repos } from "@antumbra/repos";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { AGENTS_ALIVE_GAUGE } from "#agent-domain-service.ts";
import { makeAliveAgentCount } from "#agents-alive.ts";
import { makeBackendCapacities } from "#backend-capacity.ts";
import { ChangeProcedureService } from "#change-procedures.ts";
import { makeCurrentSessionReconciler } from "#current-session-reconcile.ts";
import { imageInputBackendsOf } from "#image-input-backends.ts";
import { makeRetireKind } from "#retire.ts";
import { compileRetireSweepDemands } from "#retire-sweep-demands.ts";
import type { SessionRecoveryContext } from "#session-recovery-context.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";
import { makeSessionRecoveryRuntime } from "#session-resume.ts";
import { makeSessionSend } from "#session-send.ts";
import { makeSiestaKind } from "#session-siesta.ts";
import { compileSessionSiestaDemands } from "#session-siesta-demands.ts";
import { LiveDelegations } from "#session-tree-live.ts";
import { makeSessionNodeReconciler } from "#session-tree-reconcile.ts";
import { makeSessionTreeSinks } from "#session-tree-sink.ts";
import { makeWakeKind } from "#session-wake.ts";
import { spawnKind } from "#spawn.ts";
import { makeAgentToolCompiler } from "#spawn-tools.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";

export const makeAgentDomain = (
	backends: ReadonlyMap<string, AgentBackend>,
	runners: ReadonlyMap<string, Runner>,
) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const changes = yield* ChangeProcedureService;
		const repos = yield* Repos;
		const fabric = yield* SessionFabric;
		const live = yield* LiveDelegations;
		const resourceReconciler = yield* ResourceReconciler;
		const voyages = yield* VoyageProcedureService;
		const backendCapacities = yield* makeBackendCapacities(backends);
		const sinkFor = yield* makeSessionTreeSinks;
		const reconcileCurrentSessions = yield* makeCurrentSessionReconciler;
		const reconcileSessionNodes = yield* makeSessionNodeReconciler;
		yield* reconcileCurrentSessions;
		// why: nodes are reconciled after the roots that own them, because
		// whether a node's acquisition can ever come back is a question about
		// its root — and the roots have just been settled.
		yield* reconcileSessionNodes;
		const spawn = yield* spawnKind({
			backends,
			capacities: backendCapacities,
			runners,
			sinkFor,
		});
		const retire = yield* makeRetireKind;
		const compileTools = yield* makeAgentToolCompiler;
		const toolsFor = (context: SessionRecoveryContext) =>
			compileTools(context.role, context.identity);
		const recoveryRuntime = yield* makeSessionRecoveryRuntime({
			backends,
			sinkFor,
			toolsFor,
		});
		const wake = yield* makeWakeKind(backendCapacities).pipe(
			Effect.provideService(SessionRecoveryRuntime, recoveryRuntime),
		);
		const aliveAgents = yield* makeAliveAgentCount;
		const siesta = yield* makeSiestaKind;
		// why: the clock's two errands are separate sources on one loop — one
		// asks whether a process is being held for nothing, the other whether an
		// identity is being held for nothing. They read different truths and are
		// governed differently, so they are compiled apart and run together.
		// Neither of them ever puts a Session back on a provider: a Session that
		// lost its process is reported as stranded and waits to be spoken to.
		const intentDemands = [
			...(yield* compileSessionSiestaDemands(siesta)),
			...(yield* compileRetireSweepDemands(retire)),
		];
		const imageInputBackends = imageInputBackendsOf(backends);
		const sessionSend = yield* makeSessionSend(
			imageInputBackends,
			backendCapacities,
		);
		return {
			backendCapacities,
			backends: [...backends.keys()],
			boards,
			changes,
			closeSessionStarts: fabric.closeStarts(),
			gauges: { [AGENTS_ALIVE_GAUGE]: aliveAgents },
			interruptSession: fabric.interrupt,
			imageInputBackends,
			intentDemands,
			kinds: [spawn, retire, siesta, wake],
			repos,
			retryResourceReclaim: resourceReconciler.reconcile,
			reopenSessionStarts: fabric.reopenStarts(),
			retire,
			sendSessionInput: sessionSend.sendInput,
			sendToSession: sessionSend.sendPrompt,
			sessionsAttached: fabric.attached(),
			sessionsDelegating: live.delegating(),
			siesta,
			spawn,
			voyages,
			wake,
		};
	});
