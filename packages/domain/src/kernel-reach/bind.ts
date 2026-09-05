import { Kernel } from "@antumbra/kernel";
import { makeSettleWakes } from "@antumbra/sessions";
import { Effect, Layer } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import type { KernelReachService } from "#kernel-reach/installed.ts";
import { KernelReach } from "#kernel-reach/service.ts";
import { makeRouseSession } from "#kernel-rouse.ts";

export const installKernelReach = Layer.effectDiscard(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const installer = yield* KernelReach;
		const kernel = yield* Kernel;
		const reach: KernelReachService = {
			queueSiesta: (sessionId) =>
				kernel.submit(domain.siesta, { sessionId }).pipe(
					Effect.asVoid,
					Effect.catchCause((cause) => Effect.logWarning("a siesta could not be queued", { sessionId }, cause)),
				),
			rouseSession: yield* makeRouseSession(domain.wake),
			settleWakes: yield* makeSettleWakes(domain.wake),
			submitSpawn: (payload) => kernel.submit(domain.spawn, payload).pipe(Effect.map((submission) => submission.id)),
			submitWake: (payload) => kernel.submit(domain.wake, payload).pipe(Effect.map((submission) => submission.id)),
			wakePending: (sessionId) =>
				kernel.active(domain.wake).pipe(Effect.map((intents) => intents.some((intent) => intent.payload.sessionId === sessionId))),
		};
		yield* installer.install(reach);
	}),
);
