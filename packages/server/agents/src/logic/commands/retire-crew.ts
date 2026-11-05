import type * as Source from "@antumbra/domain-agents/commands/retire-crew.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const retireCrew = Effect.fn("Agents.retireCrew")(function* (
	input: typeof Source.retireCrew.Input.Type,
	reject: typeof Source.retireCrew.reject,
): Effect.fn.Return<typeof Source.retireCrew.emits.Payload.Type, RejectedBy<typeof Source.retireCrew.rejections>, Records> {
	const rows = yield* Records;

	const agentIds = (yield* rows.pieceAgent
		.findMany({ where: { pieceId: input.pieceId }, orderBy: { field: "storage_order", direction: "asc" }, select: pieceAgentSelection })
		.pipe(Effect.orDie)).map((link) => link.agentId);
	const roots = yield* rows.session
		.findMany({ where: { parentSessionId: null, status: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	const working = roots.find((root) => agentIds.some((id) => id === root.agentId) && root.attached && root.executionStatus === "active");
	if (working !== undefined) return yield* reject.Working({ agentId: working.agentId, sessionId: working.id });
	return { agentIds };
});
