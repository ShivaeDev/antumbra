import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import {
	storedAgentMatches,
	storedBerthsMatch,
	storedResourcesMatch,
} from "#spawn-activated-match.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeIsActivatedBirth = Effect.gen(function* () {
	const db = yield* Database;
	const agentMatches = (payload: SpawnFields) =>
		db.Agent.where({ id: payload.agentId })
			.first()
			.pipe(
				Effect.flatMap(
					Option.match({
						onNone: () => Effect.succeed(false),
						onSome: (agent) => storedAgentMatches(agent, payload),
					}),
				),
			);
	const resourcesMatch = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({
				id: payload.sessionId,
			}).first();
			const moorage = yield* db.Moorage.where({
				agentId: payload.agentId,
			}).first();
			if (Option.isNone(session) || Option.isNone(moorage)) {
				return false;
			}
			return yield* storedResourcesMatch(session.value, moorage.value, payload);
		});
	const berthsMatch = (payload: SpawnFields) =>
		db.Berth.where({ agentId: payload.agentId })
			.all()
			.pipe(Effect.flatMap((berths) => storedBerthsMatch(berths, payload)));
	const pieceAssignmentMatches = (payload: SpawnFields) => {
		if (payload.pieceId === undefined) {
			return Effect.succeed(true);
		}
		return db.PieceAgent.where({
			agentId: payload.agentId,
			pieceId: payload.pieceId,
		})
			.first()
			.pipe(Effect.map(Option.isSome));
	};
	const voyageAssignmentMatches = (payload: SpawnFields) => {
		if (payload.voyageId === undefined) {
			return Effect.succeed(true);
		}
		return db.VoyageAgent.where({
			agentId: payload.agentId,
			voyageId: payload.voyageId,
		})
			.first()
			.pipe(
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
