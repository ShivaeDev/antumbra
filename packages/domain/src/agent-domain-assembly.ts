import type { AgentBackend, Runner } from "@antumbra/plugin-api";
import { compileSessionSiestaDemands, makeSiestaKind, makeWakeKind, type SessionRecoveryContext, sessionRecoveryLayer } from "@antumbra/sessions";
import { CurrentSessions } from "@antumbra/sessions/current/service";
import { SessionNodeReconciler } from "@antumbra/sessions/tree/reconcile/service";
import { SessionTreeSinks } from "@antumbra/sessions/tree/sink/service";
import type { SinkFor } from "@antumbra/sessions/tree/sink/sink-for";
import { Effect } from "effect";
import { mailDeliveryDemands } from "#mail-delivery/demands.ts";
import { MailDelivery } from "#mail-delivery/service.ts";
import { makeRetireKind } from "#retire.ts";
import { compileRetireSweepDemands } from "#retire-sweep-demands.ts";
import { makeSessionAgentSettings } from "#session-agent-settings.ts";
import { compileSmoothingDemands } from "#smoothing/demands.ts";
import { smoothingKinds } from "#smoothing/kinds.ts";
import { spawnKind } from "#spawn.ts";
import { makeAgentToolCompiler } from "#spawn-tools.ts";

export const makeAgentDomain = (backends: ReadonlyMap<string, AgentBackend>, runners: ReadonlyMap<string, Runner>) =>
	Effect.gen(function* () {
		const mail = yield* MailDelivery;
		const sinks = yield* SessionTreeSinks;
		const afterRest = mail.deliver();
		const sinkFor: SinkFor = (rootSessionId, audit) => sinks.create(rootSessionId, audit, afterRest);
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
		const { smooth, smoothPiece } = yield* smoothingKinds({ backends, runners, sinkFor });
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
			...(yield* compileSmoothingDemands(smooth, smoothPiece)),
		];
		return {
			intentDemands,
			kinds: [spawn, retire, siesta, smooth, smoothPiece, wake],
			retire,
			siesta,
			smooth,
			smoothPiece,
			spawn,
			wake,
		};
	});
