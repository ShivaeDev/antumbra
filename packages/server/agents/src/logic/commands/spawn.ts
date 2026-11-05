import type * as Source from "@antumbra/domain-agents/commands/spawn.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";

export const spawn = Effect.fn("Agents.spawn")(function* (
	input: typeof Source.spawn.Input.Type,
	reject: typeof Source.spawn.reject,
): Effect.fn.Return<typeof Source.spawn.emits.Payload.Type, RejectedBy<typeof Source.spawn.rejections>, Records> {
	const rows = yield* Records;

	const ids = identity(input.requestId);
	if (
		yield* rows.agent.count({ where: { id: ids.agentId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		return yield* reject.AgentExists({ id: ids.agentId });
	return {
		wakeSessionId: null,
		id: ids.birthId,
		source: "direct" as const,
		agentId: ids.agentId,
		sessionId: ids.sessionId,
		voyageId: null,
		pieceId: null,
		backend: input.backend,
		model: input.model,
		effort: input.effort,
		role: input.role,
	};
});
