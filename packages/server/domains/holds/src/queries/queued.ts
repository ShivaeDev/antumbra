import type { dispatch } from "@antumbra/domain-agents/queries/dispatch.ts";
import type { birth } from "@antumbra/domain-agents/rows/birth.ts";
import type { PendingAttempt } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { WAKE_SWITCHES } from "@antumbra/domain-mail/queries/due-mail.ts";
import type { DueWake } from "@antumbra/domain-mail/queries/due-wakes.ts";
import type { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import type { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import type { SwitchKey } from "@antumbra/domain-settings/ids.ts";
import type { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { type Crew, crewVoyage, voyageName, type Waiting, waitingSession } from "#queries/waiting.ts";

const DAILY_BOARD = "The day's board";

export type Voyages = ReadonlyArray<typeof voyage.Row.Type>;

export interface Queued {
	readonly switches: Record<SwitchKey, Array<typeof Waiting.Type>>;
	readonly quieted: Map<string, Array<typeof Waiting.Type>>;
}

export const empty = (voyages: Voyages): Queued => ({
	switches: {
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
	},
	quieted: new Map(voyages.filter((held) => held.quietedAt !== null).map((held) => [String(held.id), []])),
});

export const held = (queued: Queued, key: SwitchKey, voyageId: string | null, waiting: typeof Waiting.Type): void => {
	const quieted = voyageId === null ? undefined : queued.quieted.get(voyageId);
	if (quieted === undefined) queued.switches[key].push(waiting);
	else quieted.push(waiting);
};

export const waited = (entries: ReadonlyArray<typeof Waiting.Type>): ReadonlyArray<typeof Waiting.Type> =>
	entries.toSorted((left, right) => (right.waitedMillis ?? 0) - (left.waitedMillis ?? 0));

export const addPieces = (queued: Queued, ready: (typeof dispatch.output.Type)["ready"], now: number): void => {
	for (const target of ready) {
		held(queued, target.root === null ? "spawnForPiece" : "resumePieces", target.voyage.id, {
			id: target.piece.id,
			title: target.piece.title,
			voyage: target.voyage.name,
			mail: null,
			waitedMillis: target.piece.launchedAt === null ? null : now - Date.parse(target.piece.launchedAt),
		});
	}
};

export const addMail = (queued: Queued, wakes: ReadonlyArray<DueWake>, crew: Crew, roles: ReadonlyMap<string, string>): void => {
	for (const wake of wakes) {
		held(queued, WAKE_SWITCHES[wake.batch.precedence], wake.voyageId, {
			id: wake.sessionId,
			title: roles.get(wake.agentId) ?? wake.agentId,
			voyage: crew.voyages.get(wake.agentId)?.name ?? null,
			mail: wake.batch,
			waitedMillis: wake.waitedMillis,
		});
	}
};

export const addHails = (
	queued: Queued,
	operations: ReadonlyArray<typeof sessionOperation.Row.Type>,
	births: ReadonlyArray<typeof birth.Row.Type>,
	seen: { readonly crew: Crew; readonly now: number; readonly voyages: Voyages },
): void => {
	for (const operation of operations) {
		if (operation.gatedBy !== "wakeOnHail" || operation.status !== "requested") continue;
		const sailing = crewVoyage(seen.crew, operation.sessionId);
		const waiting = waitingSession(seen.crew, operation.sessionId, operation.id, seen.now - Date.parse(operation.requestedAt));
		held(queued, "wakeOnHail", sailing?.id ?? null, waiting);
	}
	for (const born of births) {
		if (born.source !== "hail" || (born.status !== "requested" && born.status !== "waiting")) continue;
		held(queued, "spawnOnHail", born.voyageId, {
			id: born.id,
			title: born.role,
			voyage: voyageName(seen.voyages, born.voyageId),
			mail: null,
			waitedMillis: seen.now - Date.parse(born.requestedAt),
		});
	}
};

export const addSmoothing = (
	queued: Queued,
	attempts: ReadonlyArray<typeof PendingAttempt.Type>,
	pieces: ReadonlyArray<typeof piece.Row.Type>,
	seen: { readonly now: number; readonly voyages: Voyages },
): void => {
	for (const attempt of attempts) {
		if (!attempt.held) continue;
		held(queued, "spawnSmoother", attempt.voyageId, {
			id: attempt.id,
			title: pieces.find((waits) => waits.id === attempt.pieceId)?.title ?? DAILY_BOARD,
			voyage: voyageName(seen.voyages, attempt.voyageId),
			mail: null,
			waitedMillis: seen.now - Date.parse(attempt.requestedAt),
		});
	}
};
