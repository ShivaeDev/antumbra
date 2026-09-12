import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { each, run } from "@antumbra/server-journal/reconcile.ts";
import { Effect } from "effect";
import { claim } from "#commands/claim.ts";
import { candidates } from "#queries/candidates.ts";
import { claims } from "#queries/claims.ts";
import { retryable } from "#queries/retryable.ts";

const requestClaim = Effect.fn("Reclamation.requestClaim")(function* (agentId: string) {
	const commit = yield* Commit;
	yield* commit.commit(claim, { agentId, requestId: Id.Request.make(Id.make()) }).pipe(
		Effect.catchTags({
			AlreadyDone: () => Effect.void,
			Held: () => Effect.void,
			Ineligible: () => Effect.void,
			NothingToReclaim: () => Effect.void,
		}),
	);
});

export const reconcile = Effect.fn("Reclamation.reconcile")(function* () {
	const runners = yield* RunnerOperations;
	const live = yield* Live;
	const selection = yield* run(
		candidates,
		{},
		Effect.fn("Reclamation.select")(function* (sites) {
			const connected = new Set((yield* runners.connected).map((runner) => runner.runnerId));
			for (const site of sites) if (connected.has(site.runner)) yield* requestClaim(site.agentId);
		}),
	);
	const execution = yield* each(
		claims,
		{},
		(site) => site.reclaimRequestId,
		Effect.fn("Reclamation.execute")(function* (site) {
			if (site.reclaimRequestId === null || site.reclaimResult !== null) return;
			yield* runners.execute(site.runner, { type: "Reclaim", requestId: site.reclaimRequestId, agentId: site.agentId, berth: site });
		}),
	);
	const cadence = Effect.forever(
		Effect.gen(function* () {
			yield* Effect.sleep(300_000);
			const connected = new Set((yield* runners.connected).map((runner) => runner.runnerId));
			const held = yield* live.read(retryable, {});
			const agents = new Set(held.filter((site) => connected.has(site.runner)).map((site) => site.agentId));
			for (const agentId of agents) yield* requestClaim(agentId);
			yield* selection.refresh;
			yield* execution.refresh;
		}),
	);
	return {
		refresh: Effect.all([selection.refresh, execution.refresh], { discard: true }),
		await: Effect.all([selection.await, execution.await, cadence], { concurrency: "unbounded", discard: true }),
	};
});
