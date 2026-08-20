import {
	Kernel,
	type PayloadInvalid,
	type UnregisteredIntentTag,
} from "@antumbra/kernel";
import type { PrismaError, WriteExecutors } from "@antumbra/persistence";
import { Context, Deferred, Effect, Layer } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import type { SpawnFields } from "#spawn-fields.ts";

// why: the three ways the kernel can turn a submission away — a payload it
// cannot decode, a tag no domain registered, or the write that records the
// submission failing. Every act that reaches the kernel refuses this way.
export type SpawnRefused = PayloadInvalid | PrismaError | UnregisteredIntentTag;

export interface KernelReachService {
	readonly queueSiesta: (sessionId: string) => Effect.Effect<void>;
	readonly submitRecovery: (
		sessionId: string,
	) => Effect.Effect<string, SpawnRefused>;
	readonly submitSpawn: (
		payload: SpawnFields,
	) => Effect.Effect<string, SpawnRefused>;
}

export class KernelReach extends Context.Service<
	KernelReach,
	KernelReachService
>()("@antumbra/domain/KernelReach") {}

export class KernelReachInstaller extends Context.Service<
	KernelReachInstaller,
	{
		readonly install: (reach: KernelReachService) => Effect.Effect<void>;
	}
>()("@antumbra/domain/KernelReachInstaller") {}

// why: the domain is built before the kernel, but callers must only know the
// scheduler acts they can request. The Layer owns one late-bound path and the
// installer completes it once; callers wait instead of observing partial boot.
export const KernelReachDeferredLive = Layer.unwrap(
	Effect.gen(function* () {
		const deferred = yield* Deferred.make<KernelReachService>();
		const withReach = <A, E>(
			use: (reach: KernelReachService) => Effect.Effect<A, E>,
		) => Deferred.await(deferred).pipe(Effect.flatMap(use));
		return Layer.merge(
			Layer.succeed(KernelReach)({
				queueSiesta: (sessionId) =>
					withReach((reach) => reach.queueSiesta(sessionId)),
				submitRecovery: (sessionId) =>
					withReach((reach) => reach.submitRecovery(sessionId)),
				submitSpawn: (payload) =>
					withReach((reach) => reach.submitSpawn(payload)),
			}),
			Layer.succeed(KernelReachInstaller)({
				install: (reach) =>
					Deferred.succeed(deferred, reach).pipe(Effect.asVoid),
			}),
		);
	}),
);

// why: the tools a session acts through are built inside the spawn intent,
// which already runs under the kernel — but the domain that owns them was
// built before it. This layer closes the circle from above and is the only
// place the kernel and an agent's own acts meet; it stands beside the
// dispatcher, which reaches the kernel the same way.
export const KernelReachLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const installer = yield* KernelReachInstaller;
		const kernel = yield* Kernel;
		const executors = yield* Effect.context<WriteExecutors>();
		const reach: KernelReachService = {
			queueSiesta: (sessionId) =>
				kernel.submit(domain.siesta, { sessionId }).pipe(
					Effect.asVoid,
					Effect.provideContext(executors),
					Effect.catchCause((cause) =>
						Effect.logWarning(
							"a stand down could not be queued",
							{ sessionId },
							cause,
						),
					),
				),
			submitRecovery: (sessionId) =>
				kernel.submit(domain.recover, { sessionId }).pipe(
					Effect.map((submission) => submission.id),
					Effect.provideContext(executors),
				),
			// why: a hail is answered rather than fired and forgotten — the caller
			// is a window or a router waiting on the intent it just asked for, so
			// the submission's id travels back and refusals stay on the channel.
			submitSpawn: (payload) =>
				kernel.submit(domain.spawn, payload).pipe(
					Effect.map((submission) => submission.id),
					Effect.provideContext(executors),
				),
		};
		yield* installer.install(reach);
	}),
);
