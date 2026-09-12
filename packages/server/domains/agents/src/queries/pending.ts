import { backendModel } from "@antumbra/domain-backends/rows/backend-model.ts";
import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { roleSetting } from "@antumbra/domain-role-settings/rows/role-setting.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.Array(birth.Row),
	reads: [pieceProgress, birth, agent, capacity, session, count, flag, roleSetting, backendModel],
	run: Effect.fn("Agents.pending")(function* (_input, rows) {
		return (yield* rows.birth.where({ status: "requested" })).toSorted(
			(a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id),
		);
	}),
});
