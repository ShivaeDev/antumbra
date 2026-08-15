import { Kernel } from "@antumbra/kernel";
import type { WriteExecutors } from "@antumbra/persistence";
import { Deferred, Effect, Layer } from "effect";
import type { KernelReach } from "#deps.ts";
import { AgentDomain } from "#domain.ts";

// why: the tools a session acts through are built inside the spawn intent,
// which already runs under the kernel — but the domain that owns them was
// built before it. This layer closes the circle from above and is the only
// place the kernel and an agent's own acts meet; it stands beside the
// dispatcher, which reaches the kernel the same way.
export const KernelReachLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const executors = yield* Effect.context<WriteExecutors>();
		const reach: KernelReach = {
			queueRetire: (agentId) =>
				kernel.submit(domain.retire, { agentId }).pipe(
					Effect.asVoid,
					Effect.provideContext(executors),
					Effect.catchCause((cause) =>
						Effect.logWarning(
							"a stand down could not be queued",
							{ agentId },
							cause,
						),
					),
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
		yield* Deferred.succeed(domain.kernelReach, reach);
	}),
);
