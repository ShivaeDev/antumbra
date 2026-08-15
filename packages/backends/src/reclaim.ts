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

const sweepAlive = (db: DatabaseService) =>
	Effect.gen(function* () {
		const alive = yield* db.Agent.where({ status: "alive" }).all();
		yield* Effect.forEach(alive, (agent) => settleAgent(db, agent.id));
		return alive.length;
	});

// why: any agent the last process left "alive" is a lie the moment the fabric
// starts empty. Dormant stays dormant: revival does not exist yet.
export const reclaimAgents = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const swept = yield* writer.write(sweepAlive(db));
	if (swept > 0) {
		yield* Effect.logInfo("boot reclaim marked alive agents dormant", {
			count: swept,
		});
	}
});
