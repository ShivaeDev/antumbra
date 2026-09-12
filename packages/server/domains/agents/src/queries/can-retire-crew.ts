import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { pieceAgent } from "#rows/piece-agent.ts";

const sessionAtRest = (root: typeof session.Row.Type, sessions: ReadonlyArray<typeof session.Row.Type>): boolean =>
	root.attached &&
	root.executionStatus === "idle" &&
	!sessions.some(
		(child) =>
			child.rootSessionId === root.id && (child.openDelegations > 0 || child.toolCalls > 0 || (child.attached && child.executionStatus !== "idle")),
	);

const agentAtRest = (agentId: string, sessions: ReadonlyArray<typeof session.Row.Type>): boolean => {
	const roots = sessions.filter((root) => root.agentId === agentId && root.parentSessionId === null);
	return roots.length > 0 && roots.every((root) => sessionAtRest(root, sessions));
};

export const canRetireCrew = query("canRetireCrew", {
	input: { pieceId: PieceId },
	output: Schema.Boolean,
	reads: [pieceProgress, agent, pieceAgent, session],
	run: Effect.fn("Agents.canRetireCrew")(function* (input, rows) {
		const progress = yield* rows.pieceProgress.find(input.pieceId);
		if (Option.isNone(progress) || progress.value.state !== "done") return false;
		const ids = new Set((yield* rows.pieceAgent.where({ pieceId: input.pieceId })).map((link) => link.agentId));
		const alive = (yield* rows.agent.where({ status: "alive" })).filter((value) => ids.has(value.id));
		const sessions = yield* rows.session.where({ status: "open" });
		return alive.length > 0 && alive.every((value) => agentAtRest(value.id, sessions));
	}),
});
