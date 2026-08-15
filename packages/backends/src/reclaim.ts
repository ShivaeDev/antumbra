import { Database, Writer } from "@antumbra/persistence";
import { Effect } from "effect";

// why: boot mirrors the kernel's intent reclaim one level up — any agent the
// last process left "alive" is a lie the moment the fabric starts empty, so
// the sweep settles rows before admission can act on them. Dormant stays
// dormant: revival is not a v0 concept.
export const reclaimAgents = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const swept = yield* writer.write(
		Effect.gen(function* () {
			const alive = yield* db.Agent.where({ status: "alive" }).all();
			yield* Effect.forEach(alive, (agent) =>
				db.Agent.where({ id: agent.id })
					.update({ status: "dormant" })
					.pipe(
						Effect.andThen(
							db.AgentSession.where({ agentId: agent.id }).update({
								status: "closed",
							}),
						),
					),
			);
			return alive.length;
		}),
	);
	if (swept > 0) {
		yield* Effect.logInfo("boot reclaim marked alive agents dormant", {
			count: swept,
		});
	}
});
