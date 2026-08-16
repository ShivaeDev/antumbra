import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Effect, PubSub } from "effect";
import type { SpawnFields } from "#spawn.ts";

export const makeMarkMoorageReady = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const feeds = yield* DomainFeeds;
	const executors = yield* Effect.context<WriteExecutors>();
	const readyRows = (payload: SpawnFields) =>
		db.Moorage.where({ agentId: payload.agentId })
			.update({ status: "ready" })
			.pipe(
				Effect.andThen(
					db.Berth.where({ agentId: payload.agentId }).update({
						status: "ready",
					}),
				),
			);
	return (payload: SpawnFields) =>
		writer
			.write(readyRows(payload))
			.pipe(
				Effect.provideContext(executors),
				Effect.andThen(PubSub.publish(feeds.fleet, undefined)),
			);
});
