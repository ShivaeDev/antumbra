import { Kernel } from "@antumbra/kernel";
import { parseCapacityHoldDetail } from "@antumbra/sessions/admission/hold";
import { Context, Effect, Layer, Option, Semaphore, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";

export class BackendCapacityReleases extends Context.Service<
	BackendCapacityReleases,
	{
		readonly release: (backend: string) => Effect.Effect<void, unknown>;
	}
>()("@antumbra/domain/BackendCapacityReleases") {}

const makeBackendCapacityReleases = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const serial = yield* Semaphore.make(1);
	const reconcile = serial.withPermit(
		Effect.gen(function* () {
			const statuses = new Map((yield* domain.backendCapacities.snapshot()).map((capacity) => [capacity.backend, capacity.status]));
			const [spawns, wakes] = yield* Effect.all([kernel.active(domain.spawn), kernel.active(domain.wake)], { concurrency: 1 });
			const parked = [...spawns, ...wakes].flatMap((intent) => {
				if (intent.status !== "waiting" || intent.detail === null) {
					return [];
				}
				const hold = parseCapacityHoldDetail(intent.detail);
				return Option.isSome(hold) && statuses.get(hold.value.backend) === "available" ? [{ detail: intent.detail, id: intent.id }] : [];
			});
			yield* Effect.forEach(parked, (intent) => kernel.retryIfWaiting(intent.id, intent.detail), { concurrency: 1, discard: true });
		}),
	);
	const release = (backend: string) =>
		domain.backendCapacities.clear(backend).pipe(Effect.andThen(reconcile), Effect.andThen(domain.backendCapacities.announce()));
	return { reconcile, release };
});

// Reconcile both after durable clear and after a waiter parks so either ordering releases eligible work.
export const BackendCapacityReleaseLive = Layer.effect(
	BackendCapacityReleases,
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const releases = yield* makeBackendCapacityReleases;
		const guarded = releases.reconcile.pipe(Effect.catchCause((cause) => Effect.logError("backend capacity release reconciliation failed", cause)));
		yield* Effect.forkScoped(
			kernel.transitions.pipe(
				Stream.filter((change) => change.status === "waiting"),
				Stream.runForEach(() => guarded),
			),
		);
		yield* Effect.yieldNow;
		yield* releases.reconcile;
		return BackendCapacityReleases.of({ release: releases.release });
	}),
);
