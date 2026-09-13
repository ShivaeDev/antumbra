import { dispatch } from "@antumbra/domain-agents/queries/dispatch.ts";
import { rest } from "@antumbra/domain-agents/queries/rest.ts";
import type { birth } from "@antumbra/domain-agents/rows/birth.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { pendingSmoothing } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import type { smoothingAttempt } from "@antumbra/domain-boards/rows/smoothing-attempt.ts";
import { pending as pendingRestart } from "@antumbra/domain-lifecycle/queries/pending.ts";
import { WAKE_SWITCHES } from "@antumbra/domain-mail/queries/due-mail.ts";
import { type DueWake, dueWakes } from "@antumbra/domain-mail/queries/due-wakes.ts";
import type { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { FLEET, SWITCH_KEYS, SwitchKey } from "@antumbra/domain-settings/ids.ts";
import { allows, FLAGS } from "@antumbra/domain-settings/queries/flags.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Clock, Effect, Schema } from "effect";
import { type Crew, crewOf, voyageName, Waiting, waitingSession } from "#queries/waiting.ts";

const DAILY_BOARD = "The day's board";

type Queued = Record<SwitchKey, Array<typeof Waiting.Type>>;
type Voyages = ReadonlyArray<typeof voyage.Row.Type>;

export const HoldQueue = Schema.Struct({
	setting: SwitchKey,
	title: Schema.String,
	description: Schema.String,
	on: Schema.Boolean,
	held: Schema.Boolean,
	waiting: Schema.Array(Waiting),
});

const empty = (): Queued => ({
	resumePieces: [],
	wakeOnFlashMail: [],
	wakeOnPriorityMail: [],
	wakeOnRoutineMail: [],
	wakeAfterRestart: [],
	wakeOnHail: [],
	spawnForPiece: [],
	spawnOnHail: [],
	spawnSmoother: [],
	sendToSiesta: [],
});

const addPieces = (queued: Queued, ready: (typeof dispatch.output.Type)["ready"], now: number): void => {
	for (const target of ready) {
		queued[target.root === null ? "spawnForPiece" : "resumePieces"].push({
			id: target.piece.id,
			title: target.piece.title,
			voyage: target.voyage.name,
			mail: null,
			waitedMillis: target.piece.launchedAt === null ? null : now - Date.parse(target.piece.launchedAt),
		});
	}
};

const addMail = (queued: Queued, wakes: ReadonlyArray<DueWake>, crew: Crew, roles: ReadonlyMap<string, string>): void => {
	for (const wake of wakes) {
		queued[WAKE_SWITCHES[wake.batch.precedence]].push({
			id: wake.sessionId,
			title: roles.get(wake.agentId) ?? wake.agentId,
			voyage: crew.voyages.get(wake.agentId) ?? null,
			mail: wake.batch,
			waitedMillis: wake.waitedMillis,
		});
	}
};

const addHails = (
	queued: Queued,
	operations: ReadonlyArray<typeof sessionOperation.Row.Type>,
	births: ReadonlyArray<typeof birth.Row.Type>,
	seen: { readonly crew: Crew; readonly now: number; readonly voyages: Voyages },
): void => {
	for (const operation of operations) {
		if (operation.gatedBy !== "wakeOnHail" || operation.status !== "requested") continue;
		queued.wakeOnHail.push(waitingSession(seen.crew, operation.sessionId, operation.id, seen.now - Date.parse(operation.requestedAt)));
	}
	for (const born of births) {
		if (born.source !== "hail" || (born.status !== "requested" && born.status !== "waiting")) continue;
		queued.spawnOnHail.push({
			id: born.id,
			title: born.role,
			voyage: voyageName(seen.voyages, born.voyageId),
			mail: null,
			waitedMillis: seen.now - Date.parse(born.requestedAt),
		});
	}
};

const addSmoothing = (
	queued: Queued,
	attempts: ReadonlyArray<typeof smoothingAttempt.Row.Type>,
	pieces: ReadonlyArray<typeof piece.Row.Type>,
	seen: { readonly now: number; readonly voyages: Voyages },
): void => {
	for (const attempt of attempts) {
		if (attempt.by === "admiral") continue;
		queued.spawnSmoother.push({
			id: attempt.id,
			title: pieces.find((held) => held.id === attempt.pieceId)?.title ?? DAILY_BOARD,
			voyage: voyageName(seen.voyages, attempt.voyageId),
			mail: null,
			waitedMillis: seen.now - Date.parse(attempt.requestedAt),
		});
	}
};

export const queues = query("queues", {
	input: {},
	output: Schema.Struct({ everything: Schema.Boolean, queues: Schema.Array(HoldQueue) }),
	reads: [...dispatch.reads, ...dueWakes.reads, ...rest.reads, ...pendingSmoothing.reads, ...pendingRestart.reads, voyageAgent, voyage, flag],
	run: Effect.fn("holds.queues")(function* (_input, rows) {
		const flags = yield* rows.flag.where({ scope: FLEET });
		const everything = flags.find((held) => held.key === "holdEverything")?.on ?? FLAGS.holdEverything.fallback;
		const now = yield* Clock.currentTimeMillis;
		const agents = yield* rows.agent.where({});
		const voyages = yield* rows.voyage.where({});
		const crew = crewOf(agents, yield* rows.voyageAgent.where({}), voyages);
		const queued = empty();
		addPieces(queued, (yield* dispatch.run({}, rows, {})).ready, now);
		addMail(queued, (yield* dueWakes.run({}, rows, {})).wakes, crew, new Map(agents.map((held) => [String(held.id), held.role])));
		addHails(queued, yield* rows.sessionOperation.where({}), yield* rows.birth.where({}), { crew, now, voyages });
		addSmoothing(queued, yield* pendingSmoothing.run({}, rows, {}), yield* rows.piece.where({}), { now, voyages });
		for (const sessionId of (yield* pendingRestart.run({}, rows, {})) ?? []) {
			queued.wakeAfterRestart.push(waitingSession(crew, sessionId, sessionId, null));
		}
		for (const siesta of (yield* rest.run({}, rows, {})).siestas) {
			if (siesta.waitUntil > now) continue;
			queued.sendToSiesta.push(waitingSession(crew, siesta.sessionId, siesta.sessionId, now - Date.parse(siesta.idleSince)));
		}
		const listed: Array<typeof HoldQueue.Type> = [];
		for (const key of SWITCH_KEYS) {
			if (queued[key].length === 0) continue;
			listed.push({
				setting: key,
				title: FLAGS[key].title,
				description: FLAGS[key].description,
				on: flags.find((held) => held.key === key)?.on ?? FLAGS[key].fallback,
				held: !allows(flags, key),
				waiting: queued[key].toSorted((left, right) => (right.waitedMillis ?? 0) - (left.waitedMillis ?? 0)),
			});
		}
		return { everything, queues: listed };
	}),
});
