import { Effect, Result } from "effect";
import { CurrentSessions } from "#current/service.ts";
import type { SessionRecoveryContext } from "#recovery/context.ts";
import { aliveAgent } from "#recovery/contexts/alive-agent.ts";
import { authority } from "#recovery/contexts/authority.ts";
import { ensureResources } from "#recovery/contexts/ensure-resources.ts";
import { recoveryHeld } from "#recovery/error.ts";

export const load = Effect.fn("SessionRecoveryContexts.load")(function* (sessionId: string) {
	const current = yield* CurrentSessions;

	const session = yield* current.resumable(sessionId);
	if (Result.isFailure(session)) {
		return Result.fail(session.failure);
	}
	const row = session.success;
	const agent = yield* aliveAgent(row.agentId);
	if (Result.isFailure(agent)) {
		return Result.fail(agent.failure);
	}
	yield* ensureResources(row.agentId, row.cwd, sessionId);
	if (row.nativeRef === null) {
		return yield* recoveryHeld(`${sessionId} has no provider-native reference`);
	}
	const assignments = yield* authority(row.agentId, sessionId);
	return Result.succeed<SessionRecoveryContext>({
		backend: row.backend,
		cwd: row.cwd,
		identity: { agentId: row.agentId, sessionId, ...assignments },
		nativeRef: row.nativeRef,
		role: agent.success.role,
	});
});
