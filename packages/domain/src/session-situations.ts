import type { ChangeRow, PieceChangeRow } from "@antumbra/changes";
import type { ChangeSituation, SessionSituation } from "@antumbra/contract";
import type { AssignmentRow } from "#voyage-rows.ts";

export interface ChangeLinks {
	readonly assignments: ReadonlyArray<AssignmentRow>;
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
}

// why: the record already holds the three readings — a Change that no longer
// merges, checks that came back red, a reviewer who asked for changes — so the
// situations are named from what was observed rather than asked of the host
// again. Nothing here reaches outside the last observation.
const situationsOf = (change: ChangeRow): ReadonlyArray<ChangeSituation> => [
	...(change.mergeable === "conflict" ? (["merge_conflicts"] as const) : []),
	...(change.checks === "red" ? (["checks_failed"] as const) : []),
	...(change.review === "changes_requested"
		? (["unresolved_reviews"] as const)
		: []),
];

// why: only a Change the host is presenting can be in one of these states, and
// only one the host can name is worth pointing an Agent at — a Change with no
// external reference has no threads, no checks and no merge to be blocked.
const addressableChanges = (
	changes: ReadonlyArray<ChangeRow>,
): ReadonlyMap<string, ChangeRow> =>
	new Map(
		changes
			.filter((change) => change.stage === "open" && change.externalId !== null)
			.map((change) => [change.id, change]),
	);

// why: the link that carries the work is `produces`. An Agent reviewing
// somebody else's Change, or waiting on one, is not the hand that resolves its
// conflicts, and offering it the control would send the words to the wrong
// Session.
const producedChangeIds = (
	pieceChanges: ReadonlyArray<PieceChangeRow>,
	pieceId: string,
): ReadonlyArray<string> =>
	pieceChanges
		.filter((link) => link.pieceId === pieceId && link.purpose === "produces")
		.map((link) => link.changeId);

const situationsForAgent = (
	links: ChangeLinks,
	open: ReadonlyMap<string, ChangeRow>,
	agentId: string,
): ReadonlyArray<SessionSituation> =>
	links.assignments
		.filter((assignment) => assignment.agentId === agentId)
		.flatMap((assignment) =>
			producedChangeIds(links.pieceChanges, assignment.pieceId),
		)
		.flatMap((changeId) => {
			const change = open.get(changeId);
			return change === undefined
				? []
				: situationsOf(change).map((situation) => ({
						changeId,
						reference: `#${change.externalId}`,
						situation,
					}));
		});

// why: built once for the whole snapshot and keyed by Agent, because an Agent's
// Changes are reached through its piece assignments and every root Session of
// that Agent answers for the same work. Reading it per Session would walk the
// same links once for each of them.
export const situationsByAgent = (
	links: ChangeLinks,
	agentIds: ReadonlyArray<string>,
): ReadonlyMap<string, ReadonlyArray<SessionSituation>> => {
	const open = addressableChanges(links.changes);
	return new Map(
		agentIds.map((agentId) => [
			agentId,
			situationsForAgent(links, open, agentId),
		]),
	);
};
