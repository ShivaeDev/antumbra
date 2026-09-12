import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { COUNTS } from "@antumbra/domain-settings/ids.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { startAdmitted } from "#facts/start-admitted.ts";
import { StartId } from "#ids.ts";
import { start } from "#rows/start.ts";
export const admit = command("admit", {
	input: { id: StartId },
	reads: [start, agent, session, count, flag, capacity],
	emits: startAdmitted,
	rejections: {
		Unknown: { id: Schema.String },
		NotRequested: { id: Schema.String },
		Held: { reason: Schema.String },
		NoSlot: { limit: Schema.Number },
		NotOldest: { id: Schema.String },
	},
	run: Effect.fn("Starts.admit")(function* (input, rows, reject) {
		const found = yield* rows.start.find(input.id);
		if (Option.isNone(found)) return yield* reject.Unknown({ id: input.id });
		const held = found.value;
		if (held.status !== "requested") return yield* reject.NotRequested({ id: input.id });
		const flags = yield* rows.flag.where({});
		if (flags.some((value) => value.on && (value.key === "holdEverything" || (held.pieceId !== null && value.key === "holdPieceDispatch"))))
			return yield* reject.Held({ reason: "dispatch held" });
		const capacities = yield* rows.capacity.where({});
		if (capacities.some((value) => value.backend === held.backend && value.status === "blocked"))
			return yield* reject.Held({ reason: "provider capacity" });
		const starts = yield* rows.start.where({});
		const oldest = starts
			.filter(
				(value) =>
					value.status === "requested" &&
					!capacities.some((c) => c.backend === value.backend && c.status === "blocked") &&
					!(value.pieceId !== null && flags.some((f) => f.on && f.key === "holdPieceDispatch")),
			)
			.toSorted((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id))[0];
		if (oldest !== undefined && oldest.id !== held.id) return yield* reject.NotOldest({ id: oldest.id });
		const chosen = yield* rows.count.find("maxParallelSessions");
		const limit = Option.isSome(chosen) ? chosen.value.count : COUNTS.maxParallelSessions.fallback;
		const sessions = yield* rows.session.where({ parentSessionId: null, status: "open" });
		const occupied = new Set(starts.filter((value) => value.status === "admitted").map((value) => value.agentId));
		for (const current of yield* rows.agent.where({ status: "alive" })) {
			const root = sessions.find((value) => value.id === current.currentSessionId);
			if (root === undefined || root.executionStatus !== "idle") occupied.add(current.id);
		}
		if (occupied.size >= limit) return yield* reject.NoSlot({ limit });
		return { id: input.id };
	}),
});
