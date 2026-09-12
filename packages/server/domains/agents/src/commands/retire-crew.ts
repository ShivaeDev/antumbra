import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { crewRetired } from "#facts/crew-retired.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
export const retireCrew = command("retireCrew", {
	input: { pieceId: PieceId },
	reads: [pieceAgent, session],
	emits: crewRetired,
	rejections: { Working: { agentId: Schema.String, sessionId: Schema.String } },
	run: Effect.fn("Agents.retireCrew")(function* (input, rows, reject) {
		const agentIds = (yield* rows.pieceAgent.where({ pieceId: input.pieceId })).map((link) => link.agentId);
		const roots = yield* rows.session.where({ parentSessionId: null, status: "open" });
		const working = roots.find((root) => agentIds.some((id) => id === root.agentId) && root.attached && root.executionStatus === "active");
		if (working !== undefined) return yield* reject.Working({ agentId: working.agentId, sessionId: working.id });
		return { agentIds };
	}),
});
