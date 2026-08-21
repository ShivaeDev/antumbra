import type { PayloadInvalid, UnregisteredIntentTag } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import { Context, Deferred, Effect, Layer } from "effect";
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
