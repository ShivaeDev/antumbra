import { Boards } from "@antumbra/boards";
import type { AgentBackend, Runner } from "@antumbra/plugin-api";
import { BackendCapacities } from "@antumbra/provider-capacity";
import { Repos } from "@antumbra/repos";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	compileSessionSiestaDemands,
	LiveDelegations,
	makeCurrentSessionReconciler,
	makeSessionNodeReconciler,
	makeSessionRecoveryRuntime,
	makeSessionSend,
	makeSessionTreeSinks,
	makeSiestaKind,
	makeWakeKind,
	type SessionRecoveryContext,
	SessionRecoveryRuntime,
} from "@antumbra/sessions";
import { Effect } from "effect";
import { ChangeProcedureService } from "#change-procedures.ts";
import { imageInputBackendsOf } from "#image-input-backends.ts";
import { makeRetireKind } from "#retire.ts";
import { compileRetireSweepDemands } from "#retire-sweep-demands.ts";
import { spawnKind } from "#spawn.ts";
import { makeAgentToolCompiler } from "#spawn-tools.ts";
import { VoyageProcedureService } from "#voyage-procedures.ts";

export const makeAgentDomain = (backends: ReadonlyMap<string, AgentBackend>, runners: ReadonlyMap<string, Runner>) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const changes = yield* ChangeProcedureService;
		const repos = yield* Repos;
		const fabric = yield* SessionFabric;
		const live = yield* LiveDelegations;
		const resourceReconciler = yield* ResourceReconciler;
		const voyages = yield* VoyageProcedureService;
		const backendCapacities = yield* BackendCapacities;
		const sinkFor = yield* makeSessionTreeSinks;
		const reconcileCurrentSessions = yield* makeCurrentSessionReconciler;
		const reconcileSessionNodes = yield* makeSessionNodeReconciler;
		yield* reconcileCurrentSessions;
		// Reconcile roots first because node acquisition liveness depends on root settlement.
		yield* reconcileSessionNodes;
		const spawn = yield* spawnKind({
			backends,
			runners,
			sinkFor,
		});
		const retire = yield* makeRetireKind;
		const compileTools = yield* makeAgentToolCompiler;
		const toolsFor = (context: SessionRecoveryContext) => compileTools(context.role, context.identity);
		const recoveryRuntime = yield* makeSessionRecoveryRuntime({
			backends,
			sinkFor,
			toolsFor,
		});
		const wake = yield* makeWakeKind.pipe(Effect.provideService(SessionRecoveryRuntime, recoveryRuntime));
		const siesta = yield* makeSiestaKind;
		const intentDemands = [...(yield* compileSessionSiestaDemands(siesta)), ...(yield* compileRetireSweepDemands(retire))];
		const imageInputBackends = imageInputBackendsOf(backends);
		const sessionSend = yield* makeSessionSend(imageInputBackends);
		return {
			backendCapacities,
			backends: [...backends.keys()],
			boards,
			changes,
			closeSessionStarts: fabric.closeStarts(),
			interruptSession: fabric.interrupt,
			imageInputBackends,
			intentDemands,
			kinds: [spawn, retire, siesta, wake],
			repos,
			retryResourceReclaim: resourceReconciler.reconcile(),
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
