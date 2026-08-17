import {
	decodeStoredAgentStatus,
	decodeStoredBerthStatus,
	decodeStoredMoorageStatus,
} from "@antumbra/agent-runtime-vocabulary";
import { Database, type WriteExecutors } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { makeCurrentSessionRecovery } from "#current-session-recovery.ts";
import { recoveryHeld } from "#session-recovery-error.ts";

const heldInvalid = (failure: { readonly message: string }) =>
	recoveryHeld(failure.message);

export const makeSessionRecoveryState = Effect.gen(function* () {
	const db = yield* Database;
	const currentSession = yield* makeCurrentSessionRecovery;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const aliveAgent = (agentId: string) =>
		Effect.gen(function* () {
			const agent = yield* provide(db.Agent.where({ id: agentId }).first());
			if (Option.isNone(agent)) {
				return agent;
			}
			const status = yield* Effect.fromResult(
				decodeStoredAgentStatus(agent.value.id, agent.value.status),
			).pipe(Effect.mapError(heldInvalid));
			return status === "alive" ? agent : Option.none();
		});
	const ensureMoorage = (agentId: string, cwd: string, sessionId: string) =>
		Effect.gen(function* () {
			const moorage = yield* provide(db.Moorage.where({ agentId }).first());
			if (Option.isNone(moorage)) {
				return yield* recoveryHeld(
					`${sessionId} is waiting for its ready Moorage`,
				);
			}
			const status = yield* Effect.fromResult(
				decodeStoredMoorageStatus(moorage.value.agentId, moorage.value.status),
			).pipe(Effect.mapError(heldInvalid));
			if (status !== "ready" || moorage.value.root !== cwd) {
				return yield* recoveryHeld(
					`${sessionId} is waiting for its ready Moorage`,
				);
			}
		});
	const ensureBerths = (agentId: string, sessionId: string) =>
		Effect.gen(function* () {
			const berths = yield* provide(db.Berth.where({ agentId }).all());
			const statuses = yield* Effect.forEach(berths, (berth) =>
				Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)).pipe(
					Effect.mapError(heldInvalid),
				),
			);
			const notReady = statuses.some((status) => status !== "ready");
			if (notReady) {
				return yield* recoveryHeld(
					`${sessionId} is waiting for its ready Berths`,
				);
			}
		});
	return {
		aliveAgent,
		ensureResources: (agentId: string, cwd: string, sessionId: string) =>
			Effect.all(
				[
					ensureMoorage(agentId, cwd, sessionId),
					ensureBerths(agentId, sessionId),
				],
				{ concurrency: 1 },
			).pipe(Effect.asVoid),
		resumableSession: currentSession.resumable,
	};
});
