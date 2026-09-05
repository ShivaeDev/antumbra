import type { AgentBackend, Runner } from "@antumbra/plugin-api";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	compileSessionSiestaDemands,
	makeSessionNodeReconciler,
	makeSessionTreeSinks,
	makeSiestaKind,
	makeWakeKind,
	type SessionRecoveryContext,
	sessionRecoveryLayer,
} from "@antumbra/sessions";
import { CurrentSessions } from "@antumbra/sessions/current/service";
import { Effect } from "effect";
import { mailDeliveryDemands } from "#mail-delivery/demands.ts";
import { MailDelivery } from "#mail-delivery/service.ts";
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
		const mail = yield* MailDelivery;
		const sinkFor = yield* makeSessionTreeSinks(mail.deliver());
		const currentSessions = yield* CurrentSessions;
		const reconcileSessionNodes = yield* makeSessionNodeReconciler;
		yield* currentSessions.reconcile();
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
			...(yield* mailDeliveryDemands),
			...(yield* compileRetireSweepDemands(retire)),
		];
		return {
			intentDemands,
			kinds: [spawn, retire, siesta, wake],
			retryResourceReclaim: resourceReconciler.reconcile(),
			retire,
			sessionsAttached: fabric.attached(),
			siesta,
			spawn,
			voyages,
			wake,
		};
	});
