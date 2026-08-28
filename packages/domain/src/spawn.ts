import { defineIntent, IntentExecution } from "@antumbra/kernel";
import type { AgentBackend, MooragePlan, Runner } from "@antumbra/plugin-api";
import { UnknownRunnerError } from "@antumbra/plugin-api";
import type { SessionAttachment } from "@antumbra/session-fabric";
import { Effect } from "effect";
import { charterDelivery } from "#charter.ts";
import { UnknownBackendTag } from "#errors.ts";
import { makePrepareMoorage } from "#moorage-plan.ts";
import type { SinkFor } from "#session-tree-sink.ts";
import { makeIsActivatedBirth } from "#spawn-activated.ts";
import { type SpawnFields, SpawnPayload } from "#spawn-fields.ts";
import { spawnRegistration } from "#spawn-registration/service.ts";
import { spawnResolution } from "#spawn-resolution.ts";
import { makeSpawnSessionStart } from "#spawn-session-start.ts";
import { makeSpawnTeardown } from "#spawn-teardown.ts";
import { makeSpawnTools } from "#spawn-tools.ts";
import { underSpawnedAgent } from "#spawn-trace.ts";

export type { SpawnFields } from "#spawn-fields.ts";

interface SpawnRuntime {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly runners: ReadonlyMap<string, Runner>;
	readonly sinkFor: SinkFor;
}

export const spawnKind = (runtime: SpawnRuntime) =>
	Effect.gen(function* () {
		const delivery = yield* charterDelivery;
		const prepareMoorage = yield* makePrepareMoorage;
		const isActivatedBirth = yield* makeIsActivatedBirth;
		const registration = yield* spawnRegistration;
		const resolution = yield* spawnResolution;
		const startSession = yield* makeSpawnSessionStart;
		const teardown = yield* makeSpawnTeardown;
		const toolsFor = yield* makeSpawnTools;
		const admitSpawnSession = (
			payload: SpawnFields,
			attachment: SessionAttachment,
		) =>
			Effect.gen(function* () {
				yield* delivery.deliverOnce(payload, attachment.handle);
				yield* resolution.activate(payload);
			});
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
						RunnerFailure: (failure) =>
							teardown.failAfterSettlement(payload, failure),
						RunnerProvisionConflict: (failure) =>
							execution.wait(failure.message),
					}),
				);
				yield* execution.step("provision-moorage", reconcile);
			});
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
					Effect.onError(teardown.settleUnlessTeardown(payload)),
				);
				yield* reconcileMoorage(payload, runner, plan).pipe(
					Effect.onInterrupt(() => teardown.settleCancellation(payload)),
				);
				yield* startSession(
					payload,
					backend,
					plan,
					toolsFor(payload),
					runtime.sinkFor(payload.sessionId, backend.audit),
					(attachment) => admitSpawnSession(payload, attachment),
					teardown.settleUnlessTeardown(payload),
				);
			}).pipe(underSpawnedAgent(payload));

		return defineIntent({
			execute: spawnAgent,
			payload: SpawnPayload,
			// why: the intent payload and provisioning rows are the restart authority;
			// a stranded attempt reruns from those durable facts, never a checkpoint.
			reclaim: "requeue",
			tag: "agent/spawn",
		});
	});
