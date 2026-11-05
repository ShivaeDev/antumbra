import type * as Source from "@antumbra/domain-agents/queries/rest.ts";
import { agentReading } from "@antumbra/domain-agents/rows/agent-reading.ts";
import type { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { COUNTS } from "@antumbra/domain-settings/queries/counts.ts";
import { allows, FLAGS } from "@antumbra/domain-settings/queries/flags.ts";
import type { count } from "@antumbra/domain-settings/rows/count.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { selection as agentReadingSelection } from "@antumbra/server-storage/records/agent-reading.ts";
import { selection as countSelection } from "@antumbra/server-storage/records/count.ts";
import { selection as flagSelection } from "@antumbra/server-storage/records/flag.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, Schema } from "effect";

const Retirement = Schema.Struct({ id: agentReading.fields.id, waitUntil: Schema.NullOr(Schema.Number) });
const Siesta = Schema.Struct({ sessionId: Schema.String, idleSince: Schema.String, waitUntil: Schema.Number, held: Schema.Boolean });

type Reading = typeof agentReading.Row.Type;
type Progress = ReadonlyArray<typeof pieceProgress.Row.Type>;

const millisOf = (held: Option.Option<typeof count.Row.Type>, fallbackMinutes: number) =>
	(Option.isSome(held) ? held.value.count : fallbackMinutes) * 60000;

const siestaOf = (reading: Reading, after: number, held: boolean): typeof Siesta.Type | undefined => {
	if (!reading.canSleep || reading.idleSince === null || reading.currentSessionId === null) return undefined;
	return { sessionId: reading.currentSessionId, idleSince: reading.idleSince, waitUntil: Date.parse(reading.idleSince) + after, held };
};

const retirementOf = (held: Reading, assigned: Progress, after: number): typeof Retirement.Type | undefined => {
	if (!held.canRetire) return undefined;
	if (assigned.some((piece) => piece.abandoned)) return { id: held.id, waitUntil: null };
	if (!assigned.some((piece) => piece.concluded) || !held.canSleep || held.idleSince === null) return undefined;
	return { id: held.id, waitUntil: Date.parse(held.idleSince) + after };
};

export const rest = Effect.fn("Agents.rest")(function* (
	_input: Schema.Struct.Type<typeof Source.rest.input>,
): Effect.fn.Return<typeof Source.rest.output.Type, never, Records> {
	const rows = yield* Records;

	const flags = yield* rows.flag
		.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: flagSelection })
		.pipe(Effect.orDie);
	const retiring = flags.find((setting) => setting.key === "retireSweep")?.on ?? FLAGS.retireSweep.fallback;
	const siestaHeld = !allows(flags, "sendToSiesta");
	const siestaAfter = millisOf(
		yield* rows.count
			.findOne({ where: { key: "idleSiestaMinutes" }, orderBy: { field: "storage_order", direction: "asc" }, select: countSelection })
			.pipe(Effect.orDie),
		COUNTS.idleSiestaMinutes.fallback,
	);
	const retireAfter = millisOf(
		yield* rows.count
			.findOne({ where: { key: "retireRestMinutes" }, orderBy: { field: "storage_order", direction: "asc" }, select: countSelection })
			.pipe(Effect.orDie),
		COUNTS.retireRestMinutes.fallback,
	);
	const progress = yield* rows.pieceProgress
		.findMany({ where: {}, orderBy: { field: "id", direction: "asc" }, select: pieceProgressSelection })
		.pipe(Effect.orDie);
	const retirements: Array<typeof Retirement.Type> = [];
	const siestas: Array<typeof Siesta.Type> = [];
	for (const held of yield* rows.agentReading
		.findMany({ where: { status: "alive" }, orderBy: { field: "storage_order", direction: "asc" }, select: agentReadingSelection })
		.pipe(Effect.orDie)) {
		const siesta = siestaOf(held, siestaAfter, siestaHeld);
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
});
