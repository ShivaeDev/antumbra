import { defineIntent, IntentExecution } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type { AgentBackend, MooragePlan, Runner } from "@antumbra/plugin-api";
import { UnknownRunnerError } from "@antumbra/plugin-api";
import { ResourceReconciler } from "@antumbra/resource-reclamation";
import type { EventSink, SessionAttachment } from "@antumbra/session-fabric";
import { Cause, Effect } from "effect";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { charterDelivery } from "#charter.ts";
import { makeCrewToolCompiler } from "#crew-tools.ts";
import { UnknownBackendTag } from "#errors.ts";
import { makePrepareMoorage } from "#moorage-plan.ts";
import { makeIsActivatedBirth } from "#spawn-activated.ts";
import { makeIsSpawnCancelling } from "#spawn-cancellation.ts";
import { type SpawnFields, SpawnPayload } from "#spawn-fields.ts";
import { spawnSessionIdentity } from "#spawn-identity.ts";
import { spawnRegistration } from "#spawn-registration.ts";
import { spawnResolution } from "#spawn-resolution.ts";
import { makeSpawnSessionStart } from "#spawn-session-start.ts";
import { isVoyageCaptainIdentity } from "#voyage-captain.ts";

export type { SpawnFields } from "#spawn-fields.ts";

interface SpawnRuntime {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly runners: ReadonlyMap<string, Runner>;
	readonly sinkFor: (
		sessionId: string,
	) => Effect.Effect<EventSink, PrismaError>;
}

export const spawnKind = (runtime: SpawnRuntime) =>
	Effect.gen(function* () {
		const delivery = yield* charterDelivery;
		const compileCaptainTools = yield* makeCaptainToolCompiler;
		const compileCrewTools = yield* makeCrewToolCompiler;
		const prepareMoorage = yield* makePrepareMoorage;
		const isActivatedBirth = yield* makeIsActivatedBirth;
		const isCancelling = yield* makeIsSpawnCancelling;
		const registration = yield* spawnRegistration;
		const resources = yield* ResourceReconciler;
		const resolution = yield* spawnResolution;
		const startSession = yield* makeSpawnSessionStart;
		const admitSpawnSession = (
			payload: SpawnFields,
			attachment: SessionAttachment,
		) =>
			Effect.gen(function* () {
				yield* delivery.deliverOnce(payload, attachment.handle);
				yield* resolution.activate(payload);
			});
		const settleAfterFailure = (payload: SpawnFields) =>
			resolution.settleFailure(payload).pipe(
				Effect.tap(() => resources.request),
				Effect.catchCause((cause) =>
					Effect.logWarning(
						"spawn failure settlement failed",
						{ agentId: payload.agentId },
						cause,
					),
				),
			);
		const settleCancellation = (payload: SpawnFields) =>
			Effect.gen(function* () {
				const execution = yield* IntentExecution;
				if (yield* isCancelling(execution.intentId)) {
					yield* settleAfterFailure(payload);
				}
			});
		const settleUnlessTeardown =
			(payload: SpawnFields) => (cause: Cause.Cause<unknown>) =>
				Effect.gen(function* () {
					if (!Cause.hasInterruptsOnly(cause)) {
						yield* settleAfterFailure(payload);
						return;
					}
					yield* settleCancellation(payload);
				});
		const failAfterSettlement = <E>(payload: SpawnFields, error: E) =>
			settleAfterFailure(payload).pipe(Effect.andThen(Effect.fail(error)));
		const reconcileMoorage = (
			payload: SpawnFields,
			runner: Runner,
			plan: MooragePlan,
		) =>
			Effect.gen(function* () {
				const execution = yield* IntentExecution;
				const reconcile = runner.provision(plan).pipe(
					Effect.catchTags({
						RunnerAuthRequired: (failure) => execution.wait(failure.message),
						RunnerFailure: (failure) => failAfterSettlement(payload, failure),
						RunnerProvisionConflict: (failure) =>
							execution.wait(failure.message),
					}),
				);
				yield* execution.step("provision-moorage", reconcile);
			});
		// why: the session's tools are bound to this agent, this session, and what
		// it answers to. Capability effects are closed here, before the callbacks
		// cross into the provider SDK.
		const toolsFor = (payload: SpawnFields) => {
			const identity = spawnSessionIdentity(payload);
			return isVoyageCaptainIdentity(payload.role, identity)
				? compileCaptainTools(identity)
				: compileCrewTools(identity);
		};
		const spawnAgent = (payload: SpawnFields) =>
			Effect.gen(function* () {
				if (yield* isActivatedBirth(payload)) {
					return;
				}
				const backend = runtime.backends.get(payload.backend);
				if (backend === undefined) {
					return yield* new UnknownBackendTag({ tag: payload.backend });
				}
				const runner = runtime.runners.get(payload.runner);
				if (runner === undefined) {
					return yield* new UnknownRunnerError({ tag: payload.runner });
				}
				yield* registration.ensure(payload);
				const plan = yield* prepareMoorage(payload, runner).pipe(
					Effect.onError(settleUnlessTeardown(payload)),
				);
				yield* reconcileMoorage(payload, runner, plan).pipe(
					Effect.onInterrupt(() => settleCancellation(payload)),
				);
				yield* startSession(
					payload,
					backend,
					plan,
					toolsFor(payload),
					runtime.sinkFor(payload.sessionId),
					(attachment) => admitSpawnSession(payload, attachment),
					settleUnlessTeardown(payload),
				);
			});

		return defineIntent({
			execute: spawnAgent,
			payload: SpawnPayload,
			// why: the intent payload and provisioning rows are the restart authority;
			// a stranded attempt reruns from those durable facts, never a checkpoint.
			reclaim: "requeue",
			tag: "agent/spawn",
		});
	});
