import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { COUNTS, FLAGS } from "@antumbra/domain-settings/ids.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";

const Retirement = Schema.Struct({ id: agentReading.fields.id, waitUntil: Schema.NullOr(Schema.Number) });
const Siesta = Schema.Struct({ sessionId: Schema.String, idleSince: Schema.String, waitUntil: Schema.Number });
const Rest = Schema.Struct({ retirements: Schema.Array(Retirement), siestas: Schema.Array(Siesta) });

type Reading = typeof agentReading.Row.Type;
type Progress = ReadonlyArray<typeof pieceProgress.Row.Type>;

const millisOf = (held: Option.Option<typeof count.Row.Type>, fallbackMinutes: number) =>
	(Option.isSome(held) ? held.value.count : fallbackMinutes) * 60000;

const siestaOf = (held: Reading, after: number): typeof Siesta.Type | undefined => {
	if (!held.canSleep || held.idleSince === null || held.currentSessionId === null) return undefined;
	return { sessionId: held.currentSessionId, idleSince: held.idleSince, waitUntil: Date.parse(held.idleSince) + after };
};

const retirementOf = (held: Reading, assigned: Progress, after: number): typeof Retirement.Type | undefined => {
	if (!held.canRetire) return undefined;
	if (assigned.some((piece) => piece.abandoned)) return { id: held.id, waitUntil: null };
	if (!assigned.some((piece) => piece.concluded) || !held.canSleep || held.idleSince === null) return undefined;
	return { id: held.id, waitUntil: Date.parse(held.idleSince) + after };
};

export const rest = query("rest", {
	input: {},
	output: Rest,
	reads: [agentReading, pieceProgress, count, flag],
	run: Effect.fn("Agents.rest")(function* (_input, rows) {
		const sweeping = yield* rows.flag.find("retireSweep");
		const retiring = Option.isSome(sweeping) ? sweeping.value.on : FLAGS.retireSweep.fallback;
		const siestaAfter = millisOf(yield* rows.count.find("idleSiestaMinutes"), COUNTS.idleSiestaMinutes.fallback);
		const retireAfter = millisOf(yield* rows.count.find("retireRestMinutes"), COUNTS.retireRestMinutes.fallback);
		const progress = yield* rows.pieceProgress.where({});
		const retirements: Array<typeof Retirement.Type> = [];
		const siestas: Array<typeof Siesta.Type> = [];
		for (const held of yield* rows.agentReading.where({ status: "alive" })) {
			const siesta = siestaOf(held, siestaAfter);
			if (siesta !== undefined) siestas.push(siesta);
			if (!retiring) continue;
			const retirement = retirementOf(
				held,
				progress.filter((piece) => held.pieceIds.includes(piece.id)),
				retireAfter,
			);
			if (retirement !== undefined) retirements.push(retirement);
		}
		return { retirements, siestas };
	}),
});
