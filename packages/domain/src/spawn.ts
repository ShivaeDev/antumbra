import { defineIntent, IntentExecution } from "@antumbra/kernel";
import type { AgentBackend, MooragePlan, Runner } from "@antumbra/plugin-api";
import { UnknownRunnerError } from "@antumbra/plugin-api";
import { BackendCapacities } from "@antumbra/provider-capacity/service";
import type { SessionAttachment } from "@antumbra/session-fabric";
import type { SinkFor } from "@antumbra/sessions";
import { admitCapacity } from "@antumbra/sessions/admission/admit";
import { Effect } from "effect";
import { AgentBirth } from "#agent-birth/service.ts";
import { UnknownBackendTag } from "#errors.ts";
import { type SpawnFields, SpawnPayload } from "#spawn-fields.ts";
import { spawnSessionIdentity } from "#spawn-identity.ts";
import { makeSpawnSessionStart } from "#spawn-session-start.ts";
import { SpawnTeardown } from "#spawn-teardown/service.ts";
import { underSpawnedAgent } from "#spawn-trace.ts";
import { AgentToolCompiler } from "#tool-compiler/service.ts";

export type { SpawnFields } from "#spawn-fields.ts";

interface SpawnRuntime {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly runners: ReadonlyMap<string, Runner>;
	readonly sinkFor: SinkFor;
}

export const spawnKind = (runtime: SpawnRuntime) =>
	Effect.gen(function* () {
		const capacities = yield* BackendCapacities;
		const birth = yield* AgentBirth;
		const startSession = yield* makeSpawnSessionStart;
		const teardown = yield* SpawnTeardown;
		const tools = yield* AgentToolCompiler;
		const admitSpawnSession = (payload: SpawnFields, attachment: SessionAttachment) =>
			Effect.gen(function* () {
				yield* birth.deliverCharter(payload, attachment.handle);
				yield* birth.activate(payload);
			});
		const reconcileMoorage = (payload: SpawnFields, runner: Runner, plan: MooragePlan) =>
			Effect.gen(function* () {
				const execution = yield* IntentExecution;
				const reconcile = runner.provision(plan).pipe(
					Effect.catchTags({
						RunnerAuthRequired: (failure) => execution.wait(failure.message),
						RunnerFailure: (failure) => teardown.afterFailure(payload).pipe(Effect.andThen(Effect.fail(failure))),
						RunnerProvisionConflict: (failure) => execution.wait(failure.message),
					}),
				);
				yield* execution.step("provision-moorage", reconcile);
			});
		const spawnAgent = (payload: SpawnFields) =>
			Effect.gen(function* () {
				if (yield* birth.isActivated(payload)) {
					return;
				}
				const backend = runtime.backends.get(payload.backend);
				if (backend === undefined) {
					return yield* new UnknownBackendTag({ tag: payload.backend });
				}
				yield* admitCapacity(payload.backend).pipe(Effect.provideService(BackendCapacities, capacities));
				const runner = runtime.runners.get(payload.runner);
				if (runner === undefined) {
					return yield* new UnknownRunnerError({ tag: payload.runner });
				}
				yield* birth.register(payload);
				const { intentId } = yield* IntentExecution;
				const plan = yield* birth.prepareMoorage(payload, runner).pipe(Effect.onError((cause) => teardown.unlessTeardown(payload, intentId, cause)));
				yield* reconcileMoorage(payload, runner, plan).pipe(Effect.onInterrupt(() => teardown.cancellation(payload, intentId)));
				yield* startSession(
					payload,
					backend,
					plan,
					yield* tools.compile(payload.role, spawnSessionIdentity(payload)),
					runtime.sinkFor(payload.sessionId, backend.audit),
					(attachment) => admitSpawnSession(payload, attachment),
					(cause) => teardown.unlessTeardown(payload, intentId, cause),
				);
			}).pipe(underSpawnedAgent(payload));

		return defineIntent({
			execute: spawnAgent,
			payload: SpawnPayload,
			// The payload and provisioning rows are restart authority; spawn has no checkpoints.
			reclaim: "requeue",
			tag: "agent/spawn",
		});
	});
