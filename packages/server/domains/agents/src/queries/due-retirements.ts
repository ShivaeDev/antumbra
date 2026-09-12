import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { COUNTS, FLAGS } from "@antumbra/domain-settings/ids.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const dueRetirements = query("dueRetirements", {
	input: { now: Schema.Number },
	output: Schema.Array(agentReading.Row),
	reads: [agentReading, pieceProgress, count, flag],
	run: Effect.fn("Agents.dueRetirements")(function* (input, rows) {
		const chosen = yield* rows.flag.find("retireSweep");
		if (!(Option.isSome(chosen) ? chosen.value.on : FLAGS.retireSweep.fallback)) return [];
		const held = yield* rows.count.find("retireRestMinutes");
		const threshold = (Option.isSome(held) ? held.value.count : COUNTS.retireRestMinutes.fallback) * 60000;
		const progress = yield* rows.pieceProgress.where({});
		return (yield* rows.agentReading.where({ status: "alive", canRetire: true })).filter((value) => {
			const assigned = progress.filter((piece) => value.pieceIds.includes(piece.id));
			if (assigned.some((piece) => piece.abandoned)) return true;
			return (
				assigned.some((piece) => piece.concluded && !piece.abandoned) &&
				value.canSleep &&
				value.idleSince !== null &&
				input.now - Date.parse(value.idleSince) >= threshold
			);
		});
	}),
});
