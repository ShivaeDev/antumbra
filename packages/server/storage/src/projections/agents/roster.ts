import type { agent } from "@antumbra/domain-agents/rows/agent.ts";
import type { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import type { birth } from "@antumbra/domain-agents/rows/birth.ts";
import type { pieceAgent } from "@antumbra/domain-agents/rows/piece-agent.ts";
import { situation } from "@antumbra/domain-agents/rows/situation.ts";
import type { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { atWork } from "@antumbra/domain-agents/rows/working.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionPresence } from "@antumbra/platform-vocabulary/agent-runtime/session-presence.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

type Agent = typeof agent.Row.Type;
type Session = typeof session.Row.Type;

interface Fleet {
	readonly births: readonly (typeof birth.Row.Type)[];
	readonly pieces: readonly (typeof pieceAgent.Row.Type)[];
	readonly sessions: readonly Session[];
	readonly voyages: readonly (typeof voyageAgent.Row.Type)[];
}

const readingOf = (held: Agent, fleet: Fleet): typeof agentReading.Row.Type => {
	const root = fleet.sessions.find((value) => value.id === held.currentSessionId && value.parentSessionId === null);
	const presence =
		root === undefined ? null : sessionPresence({ attached: root.attached, executionStatus: root.executionStatus, open: root.status === "open" });
	const kin = fleet.sessions.filter((value) => value.rootSessionId === root?.id);
	const busy = kin.some((value) => value.toolCalls > 0 || value.openDelegations > 0 || (value.attached && value.executionStatus !== "idle"));
	const owned = fleet.sessions.filter((value) => value.agentId === held.id && value.parentSessionId === null && value.status === "open");
	const stoppedAt = root?.stoppedAt ?? null;
	const stood = situation({
		birthDetail: fleet.births.find((value) => value.sessionId === held.currentSessionId)?.detail ?? null,
		commands: root?.openDelegations ?? 0,
		presence,
		status: held.status,
		stoppedAt,
		subAgents: kin.filter((value) => value.parentSessionId !== null && value.status === "open").length,
		toolCalls: root?.toolCalls ?? 0,
	});
	return {
		...held,
		pieceIds: fleet.pieces.filter((link) => link.agentId === held.id).map((link) => link.pieceId),
		voyageIds: fleet.voyages.filter((link) => link.agentId === held.id).map((link) => link.voyageId),
		state: stood.state,
		standing: stood.standing,
		detail: stood.detail,
		backend: root?.backend ?? null,
		idleSince: root?.idleSince ?? null,
		atWork: atWork(
			held,
			fleet.sessions.filter((value) => value.parentSessionId === null && value.status === "open"),
		),
		canSend: held.status === "alive" && root?.status === "open",
		canSleep: held.status === "alive" && presence === "idle" && !busy,
		working: presence === "working",
		canInterrupt: presence === "working" && stoppedAt === null,
		canRetire: held.status !== "retired" && !owned.some((value) => value.attached && value.executionStatus === "active"),
	};
};

export const roster = Effect.fn("Agents.roster")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const fleet: Fleet = {
		births: yield* reads.birth
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
			.pipe(Effect.orDie),
		pieces: yield* reads.pieceAgent
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceAgentSelection })
			.pipe(Effect.orDie),
		sessions: yield* reads.session
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
			.pipe(Effect.orDie),
		voyages: yield* reads.voyageAgent
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
			.pipe(Effect.orDie),
	};
	for (const held of yield* reads.agent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie)) {
		const value = readingOf(held, fleet);
		if (
			yield* writes.agentReading.count({ where: { id: held.id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* writes.agentReading.updateVoid({ ...value, id: held.id }).pipe(Effect.orDie);
		else yield* writes.agentReading.insertVoid(value).pipe(Effect.orDie);
	}
});
