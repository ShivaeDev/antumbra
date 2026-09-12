import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionStartResult } from "@antumbra/domain-sessions/rows/session-start-result.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";
export const running = projection("birthsRunning", {
	reads: [session, birth, agent, sessionStartResult],
	writes: [birth],
	run: Effect.fn("Agents.running")(function* (reads, writes) {
		const sessions = yield* reads.session.where({ parentSessionId: null });
		const results = yield* reads.sessionStartResult.where({});
		const retired = new Set((yield* reads.agent.where({ status: "retired" })).map((held) => held.id));
		for (const held of yield* reads.birth.where({})) {
			if (retired.has(held.agentId) && ["requested", "waiting", "admitted"].includes(held.status)) {
				yield* writes.birth.update(held.id, { status: "cancelled" });
				continue;
			}
			const result = results.find((value) => value.requestId === held.operationRequestId);
			if (held.status === "admitted" && result?.status === "failed") {
				yield* writes.birth.update(held.id, { status: "waiting", detail: result.reason });
				continue;
			}
			const current = sessions.find((value) => value.id === held.sessionId);
			if (current === undefined) continue;
			if (current.status === "closed" && held.status !== "ended") yield* writes.birth.update(held.id, { status: "ended" });
			else if (current.charterDeliveredAt !== null && held.status === "admitted")
				yield* writes.birth.update(held.id, { status: "running", detail: null });
		}
	}),
});
