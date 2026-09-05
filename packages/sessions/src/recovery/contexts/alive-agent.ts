import { Database } from "@antumbra/persistence";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, Result } from "effect";
import { recoveryHeld } from "#recovery/error.ts";
import type { SessionUnresumable } from "#unresumable.ts";

export const aliveAgent = Effect.fn("SessionRecoveryContexts.aliveAgent")(function* (agentId: string) {
	const db = yield* Database;

	const agent = yield* db.Agent.where({ id: agentId }).first();
	if (Option.isNone(agent)) {
		return Result.fail<SessionUnresumable>({ _tag: "no-agent", agentId });
	}
	const status = yield* Effect.fromResult(decodeStoredAgentStatus(agent.value.id, agent.value.status)).pipe(
		Effect.mapError((failure) => recoveryHeld(failure.message)),
	);
	return status === "alive"
		? Result.succeed(agent.value)
		: Result.fail<SessionUnresumable>({
				_tag: "agent-not-alive",
				agentId,
				status,
			});
});
