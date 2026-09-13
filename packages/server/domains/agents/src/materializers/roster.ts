import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { sessionPresence } from "@antumbra/platform-vocabulary/agent-runtime/session-presence.ts";
import { Effect } from "effect";
import { agent } from "#rows/agent.ts";
import { agentReading } from "#rows/agent-reading.ts";
import { birth } from "#rows/birth.ts";
import { pieceAgent } from "#rows/piece-agent.ts";
import { situation } from "#rows/situation.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
import { atWork } from "#rows/working.ts";

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
		canInterrupt: presence === "working" && stoppedAt === null,
		canRetire: held.status !== "retired" && !owned.some((value) => value.attached && value.executionStatus === "active"),
	};
};

export const roster = projection("agentRoster", {
	reads: [agent, birth, session, pieceAgent, voyageAgent],
	writes: [agentReading],
	run: Effect.fn("Agents.roster")(function* (reads, writes) {
		const fleet: Fleet = {
			births: yield* reads.birth.where({}),
			pieces: yield* reads.pieceAgent.where({}),
			sessions: yield* reads.session.where({}),
			voyages: yield* reads.voyageAgent.where({}),
		};
		for (const held of yield* reads.agent.where({})) {
			const value = readingOf(held, fleet);
			if (yield* writes.agentReading.exists(held.id)) yield* writes.agentReading.update(held.id, value);
			else yield* writes.agentReading.insert(value);
		}
	}),
});
