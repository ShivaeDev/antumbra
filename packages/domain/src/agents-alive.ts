import { Database, type WriteExecutors } from "@antumbra/persistence";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";

// why: the gauge is read long after the domain is built and by whoever asks, so
// it carries the write context it was assembled with rather than demanding one
// from its reader — counting the living is a question about the record, not
// about who happens to be holding a transaction.
export const makeAliveAgentCount = Effect.gen(function* () {
	const db = yield* Database;
	const executors = yield* Effect.context<WriteExecutors>();
	return db.Agent.all().pipe(
		Effect.flatMap((agents) =>
			Effect.forEach(agents, (agent) =>
				Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)),
			),
		),
		Effect.map(
			(statuses) => statuses.filter((status) => status === "alive").length,
		),
		Effect.provideContext(executors),
	);
});
