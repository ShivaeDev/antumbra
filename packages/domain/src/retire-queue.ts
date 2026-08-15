import { Kernel } from "@antumbra/kernel";
import type { WriteExecutors } from "@antumbra/persistence";
import { Deferred, Effect, Layer } from "effect";
import type { QueueRetire } from "#deps.ts";
import { AgentDomain } from "#domain.ts";

// why: the crew's tools are built inside the spawn intent, which already runs
// under the kernel — but the domain that owns them was built before it. This
// layer closes the circle from above and is the only place the kernel and a
// stand_down meet; it stands beside the dispatcher, which reaches the kernel
// the same way.
export const RetireQueueLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const executors = yield* Effect.context<WriteExecutors>();
		const queue: QueueRetire = (agentId) =>
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
			);
		yield* Deferred.succeed(domain.retireQueue, queue);
	}),
);
