import { addHails, addMail, addPieces, addSmoothing, empty, held, waited } from "@antumbra/domain-holds/queries/queued.ts";
import type * as Source from "@antumbra/domain-holds/queries/queues.ts";
import { crewOf, crewVoyage, Waiting, waitingSession } from "@antumbra/domain-holds/queries/waiting.ts";
import { allows, FLAGS } from "@antumbra/domain-settings/queries/flags.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { FLEET, SWITCH_KEYS, SwitchKey } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { dispatch } from "@antumbra/server-agents/logic/queries/dispatch.ts";
import { rest } from "@antumbra/server-agents/logic/queries/rest.ts";
import { pendingSmoothing } from "@antumbra/server-boards/logic/queries/smoothing-targets.ts";
import { pending as pendingRestart } from "@antumbra/server-lifecycle/logic/queries/pending.ts";
import { dueWakes } from "@antumbra/server-mail/logic/queries/due-wakes.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { selection as flagSelection } from "@antumbra/server-storage/records/flag.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Clock, Effect, Schema } from "effect";

export const HoldQueue = Schema.Struct({
	setting: SwitchKey,
	title: Schema.String,
	description: Schema.String,
	on: Schema.Boolean,
	held: Schema.Boolean,
	waiting: Schema.Array(Waiting),
});

export const QuietVoyage = Schema.Struct({
	id: VoyageId,
	name: Schema.String,
	waiting: Schema.Array(Waiting),
});

export const queues = Effect.fn("holds.queues")(function* (
	_input: Schema.Struct.Type<typeof Source.queues.input>,
): Effect.fn.Return<typeof Source.queues.output.Type, never, Records> {
	const rows = yield* Records;

	const flags = yield* rows.flag
		.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: flagSelection })
		.pipe(Effect.orDie);
	const everything = flags.find((waits) => waits.key === "holdEverything")?.on ?? FLAGS.holdEverything.fallback;
	const now = yield* Clock.currentTimeMillis;
	const agents = yield* rows.agent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie);
	const voyages = yield* rows.voyage
		.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
		.pipe(Effect.orDie);
	const crew = crewOf(
		agents,
		yield* rows.voyageAgent
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
			.pipe(Effect.orDie),
		voyages,
	);
	const queued = empty(voyages, new Set(SWITCH_KEYS.filter((key) => !allows(flags, key))));
	addPieces(queued, (yield* dispatch({})).ready, now);
	addMail(queued, (yield* dueWakes({})).wakes, crew, new Map(agents.map((waits) => [String(waits.id), waits.role])));
	addHails(
		queued,
		yield* rows.sessionOperation
			.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
			.pipe(Effect.orDie),
		yield* rows.birth.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection }).pipe(Effect.orDie),
		{ crew, now, voyages },
	);
	addSmoothing(
		queued,
		yield* pendingSmoothing({}),
		yield* rows.piece.findMany({ where: {}, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection }).pipe(Effect.orDie),
		{ now, voyages },
	);
	for (const sessionId of (yield* pendingRestart({})) ?? []) {
		const sailing = crewVoyage(crew, sessionId);
		held(queued, "wakeAfterRestart", sailing?.id ?? null, waitingSession(crew, sessionId, sessionId, null));
	}
	for (const siesta of (yield* rest({})).siestas) {
		if (siesta.waitUntil > now) continue;
		held(queued, "sendToSiesta", null, waitingSession(crew, siesta.sessionId, siesta.sessionId, now - Date.parse(siesta.idleSince)));
	}
	const listed: Array<typeof HoldQueue.Type> = [];
	for (const key of SWITCH_KEYS) {
		const on = flags.find((waits) => waits.key === key)?.on ?? FLAGS[key].fallback;
		if (on && queued.switches[key].length === 0) continue;
		listed.push({
			setting: key,
			title: FLAGS[key].title,
			description: FLAGS[key].description,
			on,
			held: !allows(flags, key),
			waiting: waited(queued.switches[key]),
		});
	}
	const quieted: Array<typeof QuietVoyage.Type> = [];
	for (const sailing of voyages) {
		const entries = queued.quieted.get(String(sailing.id));
		if (entries === undefined) continue;
		quieted.push({ id: sailing.id, name: sailing.name, waiting: waited(entries) });
	}
	return { everything, queues: listed, quieted };
});
