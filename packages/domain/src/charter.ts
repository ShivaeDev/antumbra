import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { SessionHandle } from "@antumbra/plugin-api";
import { Clock, Effect, Option } from "effect";
import type { SpawnFields } from "#spawn.ts";

export const charterDelivery = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
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
			if (!delivered) {
				yield* handle.queue(payload.charter);
				yield* stamp(payload);
			}
		});
	return { deliverOnce };
});
