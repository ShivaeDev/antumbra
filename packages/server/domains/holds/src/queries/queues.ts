import { dispatch } from "@antumbra/domain-agents/queries/dispatch.ts";
import { rest } from "@antumbra/domain-agents/queries/rest.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { pendingSmoothing } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { pending as pendingRestart } from "@antumbra/domain-lifecycle/queries/pending.ts";
import { dueWakes } from "@antumbra/domain-mail/queries/due-wakes.ts";
import { FLEET, SWITCH_KEYS, SwitchKey } from "@antumbra/domain-settings/ids.ts";
import { allows, FLAGS } from "@antumbra/domain-settings/queries/flags.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Clock, Effect, Schema } from "effect";
import { addHails, addMail, addPieces, addSmoothing, empty, held, waited } from "#queries/queued.ts";
import { crewOf, crewVoyage, Waiting, waitingSession } from "#queries/waiting.ts";

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

export const queues = query("queues", {
	input: {},
	output: Schema.Struct({ everything: Schema.Boolean, queues: Schema.Array(HoldQueue), quieted: Schema.Array(QuietVoyage) }),
	reads: [...dispatch.reads, ...dueWakes.reads, ...rest.reads, ...pendingSmoothing.reads, ...pendingRestart.reads, voyageAgent, voyage, flag],
	run: Effect.fn("holds.queues")(function* (_input, rows) {
		const flags = yield* rows.flag.where({ scope: FLEET });
		const everything = flags.find((waits) => waits.key === "holdEverything")?.on ?? FLAGS.holdEverything.fallback;
		const now = yield* Clock.currentTimeMillis;
		const agents = yield* rows.agent.where({});
		const voyages = yield* rows.voyage.where({});
		const crew = crewOf(agents, yield* rows.voyageAgent.where({}), voyages);
		const queued = empty(voyages, new Set(SWITCH_KEYS.filter((key) => !allows(flags, key))));
		addPieces(queued, (yield* dispatch.run({}, rows, {})).ready, now);
		addMail(queued, (yield* dueWakes.run({}, rows, {})).wakes, crew, new Map(agents.map((waits) => [String(waits.id), waits.role])));
		addHails(queued, yield* rows.sessionOperation.where({}), yield* rows.birth.where({}), { crew, now, voyages });
		addSmoothing(queued, yield* pendingSmoothing.run({}, rows, {}), yield* rows.piece.where({}), { now, voyages });
		for (const sessionId of (yield* pendingRestart.run({}, rows, {})) ?? []) {
			const sailing = crewVoyage(crew, sessionId);
			held(queued, "wakeAfterRestart", sailing?.id ?? null, waitingSession(crew, sessionId, sessionId, null));
		}
		for (const siesta of (yield* rest.run({}, rows, {})).siestas) {
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
	}),
});
