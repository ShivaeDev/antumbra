import { type ChangeView, changeView, repoNameOf } from "#change-view.ts";
import { liesAtQuay, type QuayGroup, quayGroup } from "#quay/group.ts";
import type { QuayRecords } from "#quay/records.ts";

interface QuayBerthing {
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

const byActivity = (left: QuayRow, right: QuayRow): number => right.change.activityAt.getTime() - left.change.activityAt.getTime();

export const quayReading = (world: QuayRecords): QuayReading => {
	const voyages = new Map(world.voyages.map((voyage) => [voyage.id, voyage]));
	const memberships = Map.groupBy(world.memberships, (membership) => membership.pieceId);
	const links = Map.groupBy(world.pieceChanges, (link) => link.changeId);
	const sessions = new Map(world.sessions.map((session) => [session.id, session]));
	const berthings = new Map(
		world.pieces.map((piece) => [
			piece.id,
			(memberships.get(piece.id) ?? []).flatMap((membership): ReadonlyArray<QuayBerthing> => {
				const voyage = voyages.get(membership.voyageId);
				return voyage === undefined ? [] : [{ pieceId: piece.id, pieceTitle: piece.title, voyageId: voyage.id, voyageName: voyage.name }];
			}),
		]),
	);
	const rows = world.changes
		.flatMap((change): ReadonlyArray<QuayRow> => {
			if (!liesAtQuay(world, change)) return [];
			const view = changeView(repoNameOf(world, change.repoId), change);
			const group = quayGroup(view);
			const originSessionId =
				change.originSessionId !== null && change.openedByAgentId !== null && sessions.get(change.originSessionId)?.agentId === change.openedByAgentId
					? change.originSessionId
					: null;
			return (links.get(change.id) ?? []).flatMap((link) =>
				(berthings.get(link.pieceId) ?? []).map((berthing) => ({
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
		})
		.sort(byActivity);
	return {
		pieces: world.pieces.flatMap((piece) =>
			(berthings.get(piece.id) ?? []).map((berthing) => ({ id: berthing.pieceId, title: berthing.pieceTitle, voyageName: berthing.voyageName })),
		),
		rows,
	};
};
