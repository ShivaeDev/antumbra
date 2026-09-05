import { Database } from "@antumbra/persistence";
import { decodeStoredAgentStatus, decodeStoredBerthStatus, decodeStoredMoorageStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, Result } from "effect";
import { CurrentSessions } from "#current/service.ts";
import { recoveryHeld } from "#recovery/error.ts";
import type { SessionUnresumable } from "#unresumable.ts";

const heldInvalid = (failure: { readonly message: string }) => recoveryHeld(failure.message);

export const makeSessionRecoveryState = Effect.gen(function* () {
	const db = yield* Database;
	const currentSession = yield* CurrentSessions;
	const aliveAgent = (agentId: string) =>
		Effect.gen(function* () {
			const agent = yield* db.Agent.where({ id: agentId }).first();
			if (Option.isNone(agent)) {
				return Result.fail<SessionUnresumable>({ _tag: "no-agent", agentId });
			}
			const status = yield* Effect.fromResult(decodeStoredAgentStatus(agent.value.id, agent.value.status)).pipe(Effect.mapError(heldInvalid));
			return status === "alive"
				? Result.succeed(agent.value)
				: Result.fail<SessionUnresumable>({
						_tag: "agent-not-alive",
						agentId,
						status,
					});
		});
	const ensureMoorage = (agentId: string, cwd: string, sessionId: string) =>
		Effect.gen(function* () {
			const moorage = yield* db.Moorage.where({ agentId }).first();
			if (Option.isNone(moorage)) {
				return yield* recoveryHeld(`${sessionId} is waiting for its ready Moorage`);
			}
			const status = yield* Effect.fromResult(decodeStoredMoorageStatus(moorage.value.agentId, moorage.value.status)).pipe(
				Effect.mapError(heldInvalid),
			);
			if (status !== "ready" || moorage.value.root !== cwd) {
				return yield* recoveryHeld(`${sessionId} is waiting for its ready Moorage`);
			}
		});
	const ensureBerths = (agentId: string, sessionId: string) =>
		Effect.gen(function* () {
			const berths = yield* db.Berth.where({ agentId }).all();
			const statuses = yield* Effect.forEach(berths, (berth) =>
				Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)).pipe(Effect.mapError(heldInvalid)),
			);
			const notReady = statuses.some((status) => status !== "ready");
			if (notReady) {
				return yield* recoveryHeld(`${sessionId} is waiting for its ready Berths`);
			}
		});
	return {
		aliveAgent,
		ensureResources: (agentId: string, cwd: string, sessionId: string) =>
			Effect.all([ensureMoorage(agentId, cwd, sessionId), ensureBerths(agentId, sessionId)], { concurrency: 1 }).pipe(Effect.asVoid),
		resumableSession: currentSession.resumable,
	};
});
