import { Database, type DatabaseService, Writer } from "@antumbra/persistence";
import { Effect } from "effect";

const settleAgent = (db: DatabaseService, agentId: string) =>
	db.Agent.where({ id: agentId })
		.update({ status: "dormant" })
		.pipe(
			Effect.andThen(
				db.AgentSession.where({ agentId }).update({ status: "closed" }),
			),
		);

const sweepActive = (db: DatabaseService) =>
	Effect.gen(function* () {
		const alive = yield* db.Agent.where({ status: "alive" }).all();
		const spawning = yield* db.Agent.where({ status: "spawning" }).all();
		const active = [...alive, ...spawning];
		yield* Effect.forEach(active, (agent) => settleAgent(db, agent.id));
		return active.length;
	});

// why: any agent the last process left active is a lie the moment the fabric
// starts empty. Dormant stays dormant: revival does not exist yet.
export const reclaimAgents = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const swept = yield* writer.write(sweepActive(db));
	if (swept > 0) {
		yield* Effect.logInfo("boot reclaim marked active agents dormant", {
			count: swept,
		});
	}
});
