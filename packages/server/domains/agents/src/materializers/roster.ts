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
export const roster = projection("agentRoster", {
	reads: [agent, birth, session, pieceAgent, voyageAgent],
	writes: [agentReading],
	run: Effect.fn("Agents.roster")(function* (reads, writes) {
		const sessions = yield* reads.session.where({});
		const births = yield* reads.birth.where({});
		const pieces = yield* reads.pieceAgent.where({});
		const voyages = yield* reads.voyageAgent.where({});
		for (const held of yield* reads.agent.where({})) {
			const root = sessions.find((value) => value.id === held.currentSessionId && value.parentSessionId === null);
			const presence =
				root === undefined ? null : sessionPresence({ attached: root.attached, executionStatus: root.executionStatus, open: root.status === "open" });
			const kin = sessions.filter((value) => value.rootSessionId === root?.id);
			const busy = kin.some((value) => value.toolCalls > 0 || value.openDelegations > 0 || (value.attached && value.executionStatus !== "idle"));
			const owned = sessions.filter((value) => value.agentId === held.id && value.parentSessionId === null && value.status === "open");
			const stood = situation({
				birthDetail: births.find((value) => value.sessionId === held.currentSessionId)?.detail ?? null,
				commands: root?.openDelegations ?? 0,
				presence,
				status: held.status,
				subAgents: kin.filter((value) => value.parentSessionId !== null && value.status === "open").length,
				toolCalls: root?.toolCalls ?? 0,
			});
			const value = {
				...held,
				pieceIds: pieces.filter((link) => link.agentId === held.id).map((link) => link.pieceId),
				voyageIds: voyages.filter((link) => link.agentId === held.id).map((link) => link.voyageId),
				state: stood.state,
				standing: stood.standing,
				detail: stood.detail,
				backend: root?.backend ?? null,
				idleSince: root?.idleSince ?? null,
				atWork: atWork(
					held,
					sessions.filter((value) => value.parentSessionId === null && value.status === "open"),
				),
				canSend: held.status === "alive" && root?.status === "open",
				canSleep: held.status === "alive" && presence === "idle" && !busy,
				canInterrupt: presence === "working",
				canRetire: held.status !== "retired" && !owned.some((value) => value.attached && value.executionStatus === "active"),
			};
			if (yield* writes.agentReading.exists(held.id)) yield* writes.agentReading.update(held.id, value);
			else yield* writes.agentReading.insert(value);
		}
	}),
});
