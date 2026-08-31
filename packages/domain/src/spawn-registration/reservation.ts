import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { reservationFor } from "#spawn-current-session.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeSpawnReservation = Effect.gen(function* () {
	const db = yield* Database;
	const claimStoredReservation = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const stored = yield* db.Agent.where({ id: payload.agentId }).first();
			if (Option.isNone(stored)) {
				return false;
			}
			const reservation = yield* reservationFor(stored.value, payload);
			if (reservation === "current") {
				return false;
			}
			const updated = yield* db.Agent.where({
				currentSessionId: null,
				id: payload.agentId,
				status: "spawning",
			}).update({ currentSessionId: payload.sessionId });
			return updated !== null;
		});
	return (payload: SpawnFields) =>
		Effect.gen(function* () {
			const stored = yield* db.Agent.where({ id: payload.agentId }).first();
			if (Option.isSome(stored)) {
				return yield* claimStoredReservation(payload);
			}
			yield* db.Agent.create({
				charter: payload.charter,
				currentSessionId: payload.sessionId,
				id: payload.agentId,
				role: payload.role,
				status: "spawning",
			});
			return true;
		});
});
