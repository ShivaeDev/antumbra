import type { AgentBackend, Runner } from "@antumbra/plugin-api";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	compileSessionSiestaDemands,
	makeCurrentSessionReconciler,
	makeSessionNodeReconciler,
	makeSessionTreeSinks,
	makeSiestaKind,
	makeWakeKind,
	type SessionRecoveryContext,
	sessionRecoveryLayer,
} from "@antumbra/sessions";
import { Effect } from "effect";
import { makeBackendModels } from "#backend-models.ts";
import { imageInputBackendsOf } from "#image-input-backends.ts";
import { compileMailDeliveryDemands, makeMailDelivery } from "#mail-delivery-demands.ts";
import { makeRetireKind } from "#retire.ts";
import { compileRetireSweepDemands } from "#retire-sweep-demands.ts";
import { makeSessionAgentSettings } from "#session-agent-settings.ts";
import { spawnKind } from "#spawn.ts";
import { makeAgentToolCompiler } from "#spawn-tools.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

export const makeAgentDomain = (backends: ReadonlyMap<string, AgentBackend>, runners: ReadonlyMap<string, Runner>) =>
	Effect.gen(function* () {
		const fabric = yield* SessionFabric;
		const resourceReconciler = yield* ResourceReconciler;
		const voyages = yield* VoyageProcedureService;
		const deliverMail = yield* makeMailDelivery;
		const sinkFor = yield* makeSessionTreeSinks(deliverMail);
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
		const compileTools = yield* makeAgentToolCompiler(backends);
		const toolsFor = (context: SessionRecoveryContext) => compileTools(context.role, context.identity);
		const recovery = sessionRecoveryLayer({
			backends,
			settingsFor: yield* makeSessionAgentSettings,
			sinkFor,
			toolsFor,
		});
		const wake = yield* makeWakeKind.pipe(Effect.provide(recovery));
		const siesta = yield* makeSiestaKind;
		const intentDemands = [
			...(yield* compileSessionSiestaDemands(siesta)),
			...compileMailDeliveryDemands(deliverMail),
			...(yield* compileRetireSweepDemands(retire)),
		];
		const imageInputBackends = imageInputBackendsOf(backends);
		return {
			backends: [...backends.keys()],
			imageInputBackends,
			intentDemands,
			kinds: [spawn, retire, siesta, wake],
			listModels: makeBackendModels(backends),
			retryResourceReclaim: resourceReconciler.reconcile(),
			retire,
			sessionsAttached: fabric.attached(),
			siesta,
			spawn,
			voyages,
			wake,
		};
	});
