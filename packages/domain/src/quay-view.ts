import type { ChangeRow } from "#change-rows.ts";
import { type ChangeView, changeView, repoNameOf } from "#change-view.ts";
import { donePieces } from "#piece-state.ts";
import { liesAtQuay, type QuayGroup, quayGroup } from "#quay-group.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export interface QuayBerthing {
	readonly pieceId: string;
	readonly pieceTitle: string;
	readonly voyageId: string;
	readonly voyageName: string;
}

export interface QuayRow extends QuayBerthing {
	readonly change: ChangeView;
	readonly group: QuayGroup;
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
const berthingsOf = (
	world: VoyageWorld,
	pieceId: string,
): ReadonlyArray<QuayBerthing> => {
	const piece = world.pieces.find((row) => row.id === pieceId);
	if (piece === undefined) {
		return [];
	}
	return world.memberships
		.filter((membership) => membership.pieceId === pieceId)
		.flatMap((membership) => {
			const voyage = world.voyages.find(
				(row) => row.id === membership.voyageId,
			);
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

const rowsOfChange = (
	world: VoyageWorld,
	done: ReadonlySet<string>,
	change: ChangeRow,
): ReadonlyArray<QuayRow> => {
	const view = changeView(repoNameOf(world, change.repoId), change);
	const group = quayGroup(view);
	return world.pieceChanges
		.filter((link) => link.changeId === change.id)
		.filter((link) => liesAtQuay(world, done, change, link.pieceId))
		.flatMap((link) =>
			berthingsOf(world, link.pieceId).map((berthing) => ({
				...berthing,
				change: view,
				group,
			})),
		);
};

// why: newest news first — a change that moved an hour ago is the one someone
// is waiting on, whichever group it lies in.
const byActivity = (left: QuayRow, right: QuayRow): number =>
	right.change.activityAt.getTime() - left.change.activityAt.getTime();

export const quayRows = (world: VoyageWorld): ReadonlyArray<QuayRow> => {
	const done = donePieces(world);
	return world.changes
		.flatMap((change) => rowsOfChange(world, done, change))
		.sort(byActivity);
};

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
