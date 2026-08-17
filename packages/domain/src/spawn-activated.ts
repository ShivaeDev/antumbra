import { Database, type WriteExecutors } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { SpawnFields } from "#spawn.ts";
import {
	storedAgentMatches,
	storedBerthsMatch,
	storedResourcesMatch,
} from "#spawn-activated-match.ts";

export const makeIsActivatedBirth = Effect.gen(function* () {
	const db = yield* Database;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const agentMatches = (payload: SpawnFields) =>
		provide(db.Agent.where({ id: payload.agentId }).first()).pipe(
			Effect.flatMap(
				Option.match({
					onNone: () => Effect.succeed(false),
					onSome: (agent) => storedAgentMatches(agent, payload),
				}),
			),
		);
	const resourcesMatch = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const session = yield* provide(
				db.AgentSession.where({ id: payload.sessionId }).first(),
			);
			const moorage = yield* provide(
				db.Moorage.where({ agentId: payload.agentId }).first(),
			);
			if (Option.isNone(session) || Option.isNone(moorage)) {
				return false;
			}
			return yield* storedResourcesMatch(session.value, moorage.value, payload);
		});
	const berthsMatch = (payload: SpawnFields) =>
		provide(db.Berth.where({ agentId: payload.agentId }).all()).pipe(
			Effect.flatMap((berths) => storedBerthsMatch(berths, payload)),
		);
	const pieceAssignmentMatches = (payload: SpawnFields) => {
		if (payload.pieceId === undefined) {
			return Effect.succeed(true);
		}
		return provide(
			db.PieceAgent.where({
				agentId: payload.agentId,
				pieceId: payload.pieceId,
			}).first(),
		).pipe(Effect.map(Option.isSome));
	};
	const voyageAssignmentMatches = (payload: SpawnFields) => {
		if (payload.voyageId === undefined) {
			return Effect.succeed(true);
		}
		return provide(
			db.VoyageAgent.where({
				agentId: payload.agentId,
				voyageId: payload.voyageId,
			}).first(),
		).pipe(
			Effect.map((voyage) =>
				Option.isSome(voyage) ? voyage.value.role === payload.role : false,
			),
		);
	};
	return (payload: SpawnFields) =>
		Effect.all(
			[
				agentMatches(payload),
				resourcesMatch(payload),
				berthsMatch(payload),
				pieceAssignmentMatches(payload),
				voyageAssignmentMatches(payload),
			],
			{ concurrency: 1 },
		).pipe(Effect.map((matches) => matches.every(Boolean)));
});
