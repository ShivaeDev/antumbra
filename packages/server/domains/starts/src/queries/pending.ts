import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { start } from "#rows/start.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.Array(start.Row),
	reads: [pieceProgress, start, agent, capacity, session, count, flag],
	run: Effect.fn("Starts.pending")(function* (_input, rows) {
		return (yield* rows.start.where({ status: "requested" })).toSorted(
			(a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id),
		);
	}),
});
