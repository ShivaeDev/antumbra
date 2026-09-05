import type { AgentBackend, Runner } from "@antumbra/plugin-api";
import {
	compileSessionSiestaDemands,
	makeSessionTreeSinks,
	makeSiestaKind,
	makeWakeKind,
	type SessionRecoveryContext,
	sessionRecoveryLayer,
} from "@antumbra/sessions";
import { CurrentSessions } from "@antumbra/sessions/current/service";
import { SessionNodeReconciler } from "@antumbra/sessions/tree/reconcile/service";
import { Effect } from "effect";
import { mailDeliveryDemands } from "#mail-delivery/demands.ts";
import { MailDelivery } from "#mail-delivery/service.ts";
import { makeRetireKind } from "#retire.ts";
import { compileRetireSweepDemands } from "#retire-sweep-demands.ts";
import { makeSessionAgentSettings } from "#session-agent-settings.ts";
import { smoothKind } from "#smoothing/kind.ts";
import { spawnKind } from "#spawn.ts";
import { makeAgentToolCompiler } from "#spawn-tools.ts";

export const makeAgentDomain = (backends: ReadonlyMap<string, AgentBackend>, runners: ReadonlyMap<string, Runner>) =>
	Effect.gen(function* () {
		const mail = yield* MailDelivery;
		const sinkFor = yield* makeSessionTreeSinks(mail.deliver());
		const currentSessions = yield* CurrentSessions;
		const nodes = yield* SessionNodeReconciler;
		yield* currentSessions.reconcile();
		// Reconcile roots first because node acquisition liveness depends on root settlement.
		yield* nodes.reconcile();
		const spawn = yield* spawnKind({
			backends,
			runners,
			sinkFor,
		});
		const retire = yield* makeRetireKind;
		const smooth = yield* smoothKind({ backends, runners, sinkFor });
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
			kinds: [spawn, retire, siesta, smooth, wake],
			retire,
			siesta,
			smooth,
			spawn,
			wake,
		};
	});
