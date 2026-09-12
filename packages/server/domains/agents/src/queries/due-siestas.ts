import { COUNTS } from "@antumbra/domain-settings/ids.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const dueSiestas = query("dueSiestas", {
	input: { now: Schema.Number },
	output: Schema.Array(agentReading.Row),
	reads: [agentReading, count],
	run: Effect.fn("Agents.dueSiestas")(function* (input, rows) {
		const held = yield* rows.count.find("idleSiestaMinutes");
		const threshold = (Option.isSome(held) ? held.value.count : COUNTS.idleSiestaMinutes.fallback) * 60000;
		return (yield* rows.agentReading.where({ status: "alive", canSleep: true })).filter(
			(value) => value.idleSince !== null && input.now - Date.parse(value.idleSince) >= threshold,
		);
	}),
});
