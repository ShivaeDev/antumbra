import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { start } from "#rows/start.ts";
export const running = projection("startsRunning", {
	reads: [session, start],
	writes: [start],
	run: Effect.fn("Starts.running")(function* (reads, writes) {
		const sessions = yield* reads.session.where({ parentSessionId: null });
		for (const held of yield* reads.start.where({})) {
			const current = sessions.find((value) => value.id === held.sessionId);
			if (current === undefined) continue;
			if (current.status === "closed" && held.status !== "ended") yield* writes.start.update(held.id, { status: "ended" });
			else if (current.charterDeliveredAt !== null && held.status === "admitted")
				yield* writes.start.update(held.id, { status: "running", detail: null });
		}
	}),
});
