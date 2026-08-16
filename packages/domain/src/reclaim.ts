import type { IntentKind } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import { Effect } from "effect";
import type { SpawnFields } from "#spawn.ts";

const settleAgent = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.where({ id: agentId }).update({ status: "dormant" });
		yield* db.AgentSession.where({ agentId }).update({ status: "closed" });
	});

const runningBirths = (spawn: IntentKind<SpawnFields>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.Intent.where({
			status: "running",
			tag: spawn.tag,
		}).all();
		const ids = yield* Effect.forEach(rows, (row) =>
			spawn.decode(row.payload).pipe(
				Effect.map((payload): ReadonlyArray<string> => [payload.agentId]),
				Effect.catchIf(
					() => true,
					() => Effect.succeed<ReadonlyArray<string>>([]),
				),
			),
		);
		return new Set(ids.flat());
	});

const sweepAlive = (spawn: IntentKind<SpawnFields>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const preserved = yield* runningBirths(spawn);
		const alive = yield* db.Agent.where({ status: "alive" }).all();
		const reclaimable = alive.filter((agent) => !preserved.has(agent.id));
		yield* Effect.forEach(reclaimable, (agent) => settleAgent(agent.id));
		return reclaimable.length;
	});

// why: an alive row with no running birth claims a session attachment this new
// fabric does not have. If its spawn intent is still running, activation won
// the crash race and kernel reclaim must finish that same birth instead.
export const reclaimAgents = (spawn: IntentKind<SpawnFields>) =>
	Effect.gen(function* () {
		const writer = yield* Writer;
		const swept = yield* writer.write(sweepAlive(spawn));
		if (swept > 0) {
			yield* Effect.logInfo("boot reclaim marked alive agents dormant", {
				count: swept,
			});
		}
	});
