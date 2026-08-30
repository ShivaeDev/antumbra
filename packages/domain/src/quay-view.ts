import type { ChangeRow } from "@antumbra/changes";
import { type ChangeView, changeView, repoNameOf } from "#change-view.ts";
import { liesAtQuay, type QuayGroup, quayGroup } from "#quay-group.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export interface QuayBerthing {
	readonly pieceId: string;
	readonly pieceTitle: string;
	readonly voyageId: string;
	readonly voyageName: string;
}

export interface QuayRow extends QuayBerthing {
	readonly baseRef: string;
	readonly body: string;
	readonly change: ChangeView;
	readonly group: QuayGroup;
	readonly headRef: string;
	readonly headSha: string | null;
	readonly originSessionId: string | null;
}

export interface QuayPiece {
	readonly id: string;
	readonly title: string;
	readonly voyageName: string;
}

export interface QuayReading {
	readonly pieces: ReadonlyArray<QuayPiece>;
	readonly rows: ReadonlyArray<QuayRow>;
}

// why: a piece may belong to more than one voyage and a change to more than
// one piece, so a change lies at the quay once per place it was chartered for
// — the quay names where work is owed, and every owner is told.
const berthingsOf = (world: VoyageWorld, pieceId: string): ReadonlyArray<QuayBerthing> => {
	const piece = world.pieces.find((row) => row.id === pieceId);
	if (piece === undefined) {
		return [];
	}
	return world.memberships
		.filter((membership) => membership.pieceId === pieceId)
		.flatMap((membership) => {
			const voyage = world.voyages.find((row) => row.id === membership.voyageId);
			return voyage === undefined
				? []
				: [
						{
							pieceId,
							pieceTitle: piece.title,
							voyageId: voyage.id,
							voyageName: voyage.name,
						},
					];
		});
};

const rowsOfChange = (world: VoyageWorld, change: ChangeRow): ReadonlyArray<QuayRow> => {
	if (!liesAtQuay(world, change)) {
		return [];
	}
	const view = changeView(repoNameOf(world, change.repoId), change);
	const group = quayGroup(view);
	// why: the Change keeps the immutable Session identity bound to the tool
	// that created it. Legacy or adopted rows have none, and a stale or
	// cross-Agent identity is incomplete truth rather than a link.
	const originSessionId =
		change.originSessionId !== null &&
		change.openedByAgentId !== null &&
		world.sessions.some((session) => session.id === change.originSessionId && session.agentId === change.openedByAgentId)
			? change.originSessionId
			: null;
	return world.pieceChanges
		.filter((link) => link.changeId === change.id)
		.flatMap((link) =>
			berthingsOf(world, link.pieceId).map((berthing) => ({
				...berthing,
				baseRef: change.baseRef,
				body: change.body,
				change: view,
				group,
				headRef: change.headRef,
				headSha: change.headSha,
				originSessionId,
			})),
		);
};

// why: newest news first — a change that moved an hour ago is the one someone
// is waiting on, whichever group it lies in.
const byActivity = (left: QuayRow, right: QuayRow): number => right.change.activityAt.getTime() - left.change.activityAt.getTime();

export const quayRows = (world: VoyageWorld): ReadonlyArray<QuayRow> =>
	world.changes.flatMap((change) => rowsOfChange(world, change)).sort(byActivity);

// why: a change made by hand is adopted onto a piece that has none yet, so
// every piece of every voyage is offered rather than the ones already shown.
export const quayPieces = (world: VoyageWorld): ReadonlyArray<QuayPiece> =>
	world.pieces.flatMap((piece) =>
		berthingsOf(world, piece.id).map((berthing) => ({
			id: berthing.pieceId,
			title: berthing.pieceTitle,
			voyageName: berthing.voyageName,
		})),
	);

export const quayReading = (world: VoyageWorld): QuayReading => ({
	pieces: quayPieces(world),
	rows: quayRows(world),
});
