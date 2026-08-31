import { Kernel } from "@antumbra/kernel";
import { makeSettleWakes, SessionReach, type WakeFields } from "@antumbra/sessions";
import { Context, Deferred, Effect, Layer } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { makeRouseSession, type RouseRefused, type SessionRouse, type SpawnRefused } from "#kernel-rouse.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export type { RouseRefused, SessionRouse, SpawnRefused };

export interface KernelReachService {
	readonly queueSiesta: (sessionId: string) => Effect.Effect<void>;
	readonly rouseSession: (payload: WakeFields) => Effect.Effect<SessionRouse, RouseRefused>;
	readonly settleWakes: (sessionId: string) => Effect.Effect<void>;
	readonly submitSpawn: (payload: SpawnFields) => Effect.Effect<string, SpawnRefused>;
	readonly submitWake: (payload: WakeFields) => Effect.Effect<string, SpawnRefused>;
}

export class KernelReach extends Context.Service<KernelReach, KernelReachService>()("@antumbra/domain/KernelReach") {}

export class KernelReachInstaller extends Context.Service<
	KernelReachInstaller,
	{
		readonly install: (reach: KernelReachService) => Effect.Effect<void>;
	}
>()("@antumbra/domain/KernelReachInstaller") {}

// The domain precedes the kernel, so this single late-bound seam waits for installation.
export const KernelReachDeferredLive = Layer.unwrap(
	Effect.gen(function* () {
		const deferred = yield* Deferred.make<KernelReachService>();
		const withReach = <A, E>(use: (reach: KernelReachService) => Effect.Effect<A, E>) => Deferred.await(deferred).pipe(Effect.flatMap(use));
		return Layer.mergeAll(
			Layer.succeed(KernelReach)({
				queueSiesta: (sessionId) => withReach((reach) => reach.queueSiesta(sessionId)),
				rouseSession: (payload) => withReach((reach) => reach.rouseSession(payload)),
				settleWakes: (sessionId) => withReach((reach) => reach.settleWakes(sessionId)),
				submitSpawn: (payload) => withReach((reach) => reach.submitSpawn(payload)),
				submitWake: (payload) => withReach((reach) => reach.submitWake(payload)),
			}),
			Layer.succeed(SessionReach)({
				rouseSession: (payload) => withReach((reach) => reach.rouseSession(payload)),
				settleWakes: (sessionId) => withReach((reach) => reach.settleWakes(sessionId)),
			}),
			Layer.succeed(KernelReachInstaller)({
				install: (reach) => Deferred.succeed(deferred, reach).pipe(Effect.asVoid),
			}),
		);
	}),
);

export const KernelReachLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const installer = yield* KernelReachInstaller;
		const kernel = yield* Kernel;
		const reach: KernelReachService = {
			queueSiesta: (sessionId) =>
				kernel.submit(domain.siesta, { sessionId }).pipe(
					Effect.asVoid,
					Effect.catchCause((cause) => Effect.logWarning("a stand down could not be queued", { sessionId }, cause)),
				),
			rouseSession: yield* makeRouseSession(domain.wake),
			settleWakes: yield* makeSettleWakes(domain.wake),
			submitSpawn: (payload) => kernel.submit(domain.spawn, payload).pipe(Effect.map((submission) => submission.id)),
			submitWake: (payload) => kernel.submit(domain.wake, payload).pipe(Effect.map((submission) => submission.id)),
		};
		yield* installer.install(reach);
	}),
);
