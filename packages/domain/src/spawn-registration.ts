import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { ensureAgentResourcesUnclaimed } from "@antumbra/resource-reclamation";
import { Effect, Option, PubSub } from "effect";
import { reservationFor } from "#spawn-current-session.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const spawnRegistration = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const feeds = yield* DomainFeeds;
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);

	// why: the link is written beside the agent row, not after the session opens,
	// so every attempt on a piece is visible for as long as it is under way and
	// two births can never both hold it. It is a claim, not a record of service:
	// a birth that settles as failed withdraws it, so a piece is never left
	// carrying agents that never drew breath.
	const assignToPiece = (payload: SpawnFields) => {
		const pieceId = payload.pieceId;
		if (pieceId === undefined) {
			return Effect.void;
		}
		return Effect.gen(function* () {
			const created = yield* provide(
				writer.write(
					Effect.gen(function* () {
						yield* ensureAgentResourcesUnclaimed(payload.agentId).pipe(
							Effect.provideService(Database, db),
						);
						const existing = yield* db.PieceAgent.where({
							agentId: payload.agentId,
							pieceId,
						}).first();
						if (Option.isSome(existing)) {
							return false;
						}
						yield* db.PieceAgent.create({
							agentId: payload.agentId,
							pieceId,
						});
						return true;
					}),
				),
			);
			if (created) {
				yield* PubSub.publish(feeds.voyages, undefined);
			}
		});
	};

	// why: the crew row is written beside the agent row rather than after the
	// session opens, so a spawn that fails partway still leaves the voyage
	// pointing at the crew it was given — a settled dormant Agent remains visible
	// on its voyage instead of vanishing with the attempt.
	const assignToVoyage = (payload: SpawnFields) => {
		const voyageId = payload.voyageId;
		if (voyageId === undefined) {
			return Effect.void;
		}
		return Effect.gen(function* () {
			const created = yield* provide(
				writer.write(
					Effect.gen(function* () {
						yield* ensureAgentResourcesUnclaimed(payload.agentId).pipe(
							Effect.provideService(Database, db),
						);
						const existing = yield* db.VoyageAgent.where({
							agentId: payload.agentId,
							voyageId,
						}).first();
						if (Option.isSome(existing)) {
							return false;
						}
						yield* db.VoyageAgent.create({
							agentId: payload.agentId,
							role: payload.role,
							voyageId,
						});
						return true;
					}),
				),
			);
			if (created) {
				yield* PubSub.publish(feeds.voyages, undefined);
			}
		});
	};

	const ensureRows = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const stored = yield* db.Agent.where({
				id: payload.agentId,
			}).first();
			if (Option.isNone(stored)) {
				yield* db.Agent.create({
					charter: payload.charter,
					currentSessionId: payload.sessionId,
					id: payload.agentId,
					role: payload.role,
					status: "spawning",
				});
				return true;
			}
			const reservation = yield* reservationFor(stored.value, payload);
			if (reservation === "current") {
				return false;
			}
			yield* db.Agent.where({
				currentSessionId: null,
				id: payload.agentId,
			}).update({ currentSessionId: payload.sessionId });
			return true;
		});

	const ensure = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const changed = yield* provide(writer.write(ensureRows(payload)));
			if (changed) {
				yield* PubSub.publish(feeds.fleet, undefined);
				yield* PubSub.publish(feeds.voyages, undefined);
			}
			yield* assignToPiece(payload);
			yield* assignToVoyage(payload);
		});

	return { ensure };
});
