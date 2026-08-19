import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { SessionHandle } from "@antumbra/plugin-api";
import { Clock, Effect, Option } from "effect";
import {
	CAPTAIN_BERTH_ORDER,
	type CharterBerth,
	CREW_BERTH_ORDER,
	withBerths,
} from "#charter-berths.ts";
import type { SpawnFields } from "#spawn.ts";
import { spawnSessionIdentity } from "#spawn-identity.ts";
import { isVoyageCaptainIdentity } from "#voyage-captain.ts";

const berthOrderFor = (payload: SpawnFields): string =>
	isVoyageCaptainIdentity(payload.role, spawnSessionIdentity(payload))
		? CAPTAIN_BERTH_ORDER
		: CREW_BERTH_ORDER;

export const charterDelivery = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	// why: the berth carries the source it was cut from, and only the registry
	// row turns that into the name a change tool accepts — a berth whose repo
	// was forgotten can no longer be addressed and is left unnamed.
	const berthsOf = (agentId: string) =>
		Effect.gen(function* () {
			const berths = yield* db.Berth.where({ agentId })
				.orderBy((berth) => berth.createdAt.asc())
				.all();
			const repos = yield* db.Repo.orderBy((repo) =>
				repo.createdAt.asc(),
			).all();
			return berths.flatMap((berth): ReadonlyArray<CharterBerth> => {
				const repo = repos.find((row) => row.source === berth.source);
				return repo === undefined
					? []
					: [{ branch: berth.branch, path: berth.path, repo: repo.name }];
			});
		});
	const stamp = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const now = yield* Clock.currentTimeMillis;
			yield* provide(
				writer.write(
					db.AgentSession.where({ id: payload.sessionId }).update({
						charterDeliveredAt: new Date(now),
					}),
				),
			);
		});
	const deliverOnce = (payload: SpawnFields, handle: SessionHandle) =>
		Effect.gen(function* () {
			const session = yield* provide(
				db.AgentSession.where({ id: payload.sessionId }).first(),
			);
			const delivered =
				Option.isSome(session) && session.value.charterDeliveredAt !== null;
			if (delivered) {
				return;
			}
			const berths = yield* provide(berthsOf(payload.agentId));
			yield* handle.queue(
				withBerths(payload.charter, berths, berthOrderFor(payload)),
			);
			yield* stamp(payload);
		});
	return { deliverOnce };
});
