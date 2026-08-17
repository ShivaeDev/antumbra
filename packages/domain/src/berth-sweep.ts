import { decodeStoredAgentStatus } from "@antumbra/agent-runtime-vocabulary";
import { Database } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { Clock, Effect } from "effect";
import { readBerthSweep } from "#berth-sweep-read.ts";
import { makeBerthReclaimer } from "#berth-sweep-reclaim.ts";

// why: alive Agents retain their ready berths for Session recovery. Dormant
// and orphaned rows are reclaimable; unresolved changes independently hold
// either kind ahead of git work.
const verifiedSweepBerths = (runners: ReadonlyMap<string, Runner>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const reclaim = yield* makeBerthReclaimer;
		const now = yield* Clock.currentTimeMillis;
		const agents = yield* Effect.forEach(yield* db.Agent.all(), (agent) =>
			Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(
				Effect.map((status) => ({ id: agent.id, status })),
			),
		);
		const aliveIds = new Set(
			agents
				.filter((agent) => agent.status === "alive")
				.map((agent) => agent.id),
		);
		const sweep = yield* readBerthSweep;
		const ready = sweep.ready.filter((berth) => !aliveIds.has(berth.agentId));
		yield* Effect.forEach(ready, (berth) => {
			const runner = runners.get(berth.runner);
			return runner === undefined
				? Effect.void
				: reclaim.ready(runner, sweep.held, berth, now);
		});
		yield* Effect.forEach(sweep.stranded, (berth) => {
			const runner = runners.get(berth.runner);
			return runner === undefined
				? Effect.void
				: reclaim.stranded(runner, sweep.held, berth);
		});
		if (ready.length + sweep.stranded.length > 0) {
			yield* Effect.logInfo("boot berth sweep finished", {
				ready: ready.length,
				stranded: sweep.stranded.length,
			});
		}
	});

const skipInvalidSweep = (failure: { readonly message: string }) =>
	Effect.logWarning("berth sweep skipped invalid durable ownership truth", {
		failure: failure.message,
	});

// why: reclaim is destructive and Agent, Berth, and Change ownership decide
// whether it is permitted. One invalid word makes the complete reading
// uncertain, so the whole sweep stays unchanged for a later repaired boot.
export const sweepBerths = (runners: ReadonlyMap<string, Runner>) =>
	verifiedSweepBerths(runners).pipe(
		Effect.catchTags({
			StoredAgentStatusInvalid: skipInvalidSweep,
			StoredBerthStatusInvalid: skipInvalidSweep,
			StoredChangeInvalid: skipInvalidSweep,
			StoredPieceChangeInvalid: skipInvalidSweep,
		}),
	);
