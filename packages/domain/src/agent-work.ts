import type { ChangeRow } from "@antumbra/changes";
import type { AgentWork, PieceWork, WorkChange } from "@antumbra/contract";
import { changeView, repoNameOf } from "#change-view.ts";
import { liesAtQuay, quayGroup } from "#quay-group.ts";
import type { ChangeLinks } from "#session-situations.ts";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";
import { changeSeen } from "#voyage-projection.ts";
import type {
	CrewRow,
	MembershipRow,
	PieceRow,
	VoyageRow,
	VoyageWorld,
} from "#voyage-rows.ts";

// why: the rows an Agent's work is read from — what it is assigned to, which
// voyage chartered that, whose crew it is, and the Changes it produced. They
// extend the links its situations are read from so one snapshot feeds both
// readings and the two can never disagree about which Changes are whose.
export interface WorkLinks extends ChangeLinks {
	readonly crews: ReadonlyArray<CrewRow>;
	readonly dismissedChangeIds: VoyageWorld["dismissedChangeIds"];
	readonly memberships: ReadonlyArray<MembershipRow>;
	readonly pieces: ReadonlyArray<Pick<PieceRow, "id" | "title">>;
	readonly repos: VoyageWorld["repos"];
	readonly voyages: ReadonlyArray<Pick<VoyageRow, "id" | "name">>;
}

// why: a landed change is history rather than news, and the quay stops
// listing it — but the card still says the piece's work merged. A dismissed
// change is the one the admiral has already answered for, so it says nothing.
const standingOf = (
	links: WorkLinks,
	change: ChangeRow,
): WorkChange | undefined => {
	const view = changeView(repoNameOf(links, change.repoId), change);
	if (change.stage === "landed") {
		return { change: changeSeen(view), standing: "landed" };
	}
	return liesAtQuay(links, change)
		? { change: changeSeen(view), standing: quayGroup(view) }
		: undefined;
};

// why: the change a piece answers for is the one it produces. One it reviews
// or waits on is somebody else's work, and a chip for it would put another
// agent's pull request on this card.
const producedChanges = (
	links: WorkLinks,
	pieceId: string,
): ReadonlyArray<WorkChange> => {
	const produced = new Set(
		links.pieceChanges
			.filter((link) => link.pieceId === pieceId && link.purpose === "produces")
			.map((link) => link.changeId),
	);
	return links.changes
		.filter((change) => produced.has(change.id))
		.flatMap((change) => {
			const standing = standingOf(links, change);
			return standing === undefined ? [] : [standing];
		});
};

// why: a piece is named once per voyage it was chartered for, the same way the
// quay names where a change is owed — a piece with no voyage has nowhere to
// be opened, so it is not offered as somewhere to go.
const pieceWork = (
	links: WorkLinks,
	pieceId: string,
): ReadonlyArray<PieceWork> => {
	const piece = links.pieces.find((row) => row.id === pieceId);
	if (piece === undefined) {
		return [];
	}
	const changes = producedChanges(links, pieceId);
	return links.memberships
		.filter((membership) => membership.pieceId === pieceId)
		.flatMap((membership) => {
			const voyage = links.voyages.find(
				(row) => row.id === membership.voyageId,
			);
			return voyage === undefined
				? []
				: [
						{
							changes,
							kind: "piece" as const,
							pieceId,
							pieceTitle: piece.title,
							voyageId: voyage.id,
							voyageName: voyage.name,
						},
					];
		});
};

// why: the same rule the voyage reads its captain by — a captain answers to
// the voyage directly, so a crew row in that role only commands while the
// agent is assigned to no piece. An agent chartered into a piece under the
// same word is a hand, and its work is the piece.
export const workOf = (
	links: WorkLinks,
	agentId: string,
): ReadonlyArray<AgentWork> => {
	const assigned = links.assignments.filter(
		(assignment) => assignment.agentId === agentId,
	);
	if (assigned.length > 0) {
		return assigned.flatMap((assignment) =>
			pieceWork(links, assignment.pieceId),
		);
	}
	return links.crews
		.filter((crew) => crew.agentId === agentId && crew.role === CAPTAIN_ROLE)
		.flatMap((crew) => {
			const voyage = links.voyages.find((row) => row.id === crew.voyageId);
			return voyage === undefined
				? []
				: [
						{
							kind: "voyage" as const,
							voyageId: voyage.id,
							voyageName: voyage.name,
						},
					];
		});
};
