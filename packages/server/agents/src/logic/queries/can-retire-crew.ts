import type * as Source from "@antumbra/domain-agents/queries/can-retire-crew.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, type Schema } from "effect";

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

export const canRetireCrew = Effect.fn("Agents.canRetireCrew")(function* (
	input: Schema.Struct.Type<typeof Source.canRetireCrew.input>,
): Effect.fn.Return<typeof Source.canRetireCrew.output.Type, never, Records> {
	const rows = yield* Records;

	const progress = yield* rows.pieceProgress
		.findOne({ where: { id: input.pieceId }, orderBy: { field: "id", direction: "asc" }, select: pieceProgressSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(progress) || progress.value.state !== "done") return false;
	const ids = new Set(
		(yield* rows.pieceAgent
			.findMany({ where: { pieceId: input.pieceId }, orderBy: { field: "storage_order", direction: "asc" }, select: pieceAgentSelection })
			.pipe(Effect.orDie)).map((link) => link.agentId),
	);
	const alive = (yield* rows.agent
		.findMany({ where: { status: "alive" }, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie)).filter((value) => ids.has(value.id));
	const sessions = yield* rows.session
		.findMany({ where: { status: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	return alive.length > 0 && alive.every((value) => agentAtRest(value.id, sessions));
});
