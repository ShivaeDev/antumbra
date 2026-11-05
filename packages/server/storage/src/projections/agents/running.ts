import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionStartResultSelection } from "@antumbra/server-storage/records/session-start-result.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const running = Effect.fn("Agents.running")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const sessions = yield* reads.session
		.findMany({ where: { parentSessionId: null }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	const results = yield* reads.sessionStartResult
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionStartResultSelection })
		.pipe(Effect.orDie);
	const retired = new Set(
		(yield* reads.agent
			.findMany({ where: { status: "retired" }, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
			.pipe(Effect.orDie)).map((held) => held.id),
	);
	for (const held of yield* reads.birth
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie)) {
		if (retired.has(held.agentId) && ["requested", "waiting", "admitted"].includes(held.status)) {
			yield* writes.birth.updateVoid({ ...{ status: "cancelled" }, id: held.id }).pipe(Effect.orDie);
			continue;
		}
		const result = results.find((value) => value.requestId === held.operationRequestId);
		if (held.status === "admitted" && result?.status === "failed") {
			yield* writes.birth.updateVoid({ ...{ status: "waiting", detail: result.reason }, id: held.id }).pipe(Effect.orDie);
			continue;
		}
		const current = sessions.find((value) => value.id === held.sessionId);
		if (current === undefined) continue;
		if (current.status === "closed" && held.status !== "ended")
			yield* writes.birth.updateVoid({ ...{ status: "ended" }, id: held.id }).pipe(Effect.orDie);
		else if (current.charterDeliveredAt !== null && held.status === "admitted")
			yield* writes.birth.updateVoid({ ...{ status: "running", detail: null }, id: held.id }).pipe(Effect.orDie);
	}
});
