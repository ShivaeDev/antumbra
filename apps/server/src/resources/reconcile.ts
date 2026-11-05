import { candidates } from "@antumbra/domain-reclamation/queries/candidates.ts";
import { claims } from "@antumbra/domain-reclamation/queries/claims.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Reclamation } from "@antumbra/server-reclamation/service.ts";
import { each } from "@shivaedev/reconciler/each.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Effect, Fiber } from "effect";
import { watchKeys } from "#supervision/keys.ts";

const requestClaim = Effect.fn("Reclamation.requestClaim")(function* (agentId: string) {
	const reclamationService = yield* Reclamation;

	yield* reclamationService.claim({ agentId, requestId: Id.Request.make(Id.make()) }).pipe(
		Effect.catchTags({
			AlreadyDone: () => Effect.void,
			Held: () => Effect.void,
			Ineligible: () => Effect.void,
			NothingToReclaim: () => Effect.void,
		}),
	);
});

export const reconcile = Effect.fn("Reclamation.reconcile")(function* () {
	const reclamationService = yield* Reclamation;

	const runners = yield* RunnerOperations;

	const selection = yield* run({
		keys: watchKeys(candidates.reads, candidates.scope?.({})),
		read: reclamationService.candidates({}).pipe(Effect.orDie),
		act: Effect.fn("Reclamation.select")(function* (sites) {
			const connected = new Set((yield* runners.connected).map((runner) => runner.runnerId));
			for (const site of sites) if (connected.has(site.runner)) yield* requestClaim(site.agentId);
		}),
	});
	const execution = yield* each({
		keys: watchKeys(claims.reads, claims.scope?.({})),
		read: reclamationService.claims({}).pipe(Effect.orDie),
		key: (site) => site.reclaimRequestId,
		act: Effect.fn("Reclamation.execute")(function* (site) {
			if (site.reclaimRequestId === null || site.reclaimResult !== null) return;
			yield* runners.execute(site.runner, { type: "Reclaim", requestId: site.reclaimRequestId, agentId: site.agentId, berth: site });
		}),
	});
	const cadence = yield* Effect.forkScoped(
		Effect.forever(
			Effect.gen(function* () {
				const reclamationService = yield* Reclamation;

				yield* Effect.sleep(300_000);
				const connected = new Set((yield* runners.connected).map((runner) => runner.runnerId));
				const held = yield* reclamationService.retryable({}).pipe(Effect.orDie);
				const agents = new Set(held.filter((site) => connected.has(site.runner)).map((site) => site.agentId));
				for (const agentId of agents) yield* requestClaim(agentId);
				yield* selection.refresh;
				yield* execution.refresh;
			}),
		),
	);
	return {
		refresh: Effect.all([selection.refresh, execution.refresh], { discard: true }),
		await: Effect.all([selection.await, execution.await, Effect.asVoid(Fiber.join(cadence))], { concurrency: "unbounded", discard: true }),
	};
});
