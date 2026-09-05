import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Repos } from "@antumbra/repos";
import { rootSessions } from "@antumbra/sessions";
import { Effect } from "effect";
import { liesAtQuay } from "#quay/group.ts";
import { quayReading } from "#quay/view.ts";
import { byId } from "#voyage-row-projection.ts";

export const read = Effect.fn("Quay.read")(function* () {
	const changes = yield* Changes;
	const db = yield* Database;
	const repos = yield* Repos;
	const memberships = yield* db.VoyagePiece.all();
	const voyages = yield* db.Voyage.where((voyage) => voyage.id.in(memberships.map((membership) => membership.voyageId)))
		.orderBy((voyage) => voyage.createdAt.asc())
		.all();
	const voyageIds = new Set(voyages.map((voyage) => voyage.id));
	const pieceIds = memberships.filter((membership) => voyageIds.has(membership.voyageId)).map((membership) => membership.pieceId);
	const pieces = yield* db.Piece.where((piece) => piece.id.in(pieceIds))
		.orderBy((piece) => piece.createdAt.asc())
		.all();
	const snapshot = yield* changes.pendingForPieces(pieces.map((piece) => piece.id));
	const originIds = snapshot.changes.flatMap((change) =>
		liesAtQuay(snapshot, change) && change.originSessionId !== null && change.openedByAgentId !== null ? [change.originSessionId] : [],
	);
	return quayReading({
		...snapshot,
		memberships,
		pieces,
		repos: byId(yield* repos.byIds(snapshot.changes.map((change) => change.repoId))),
		sessions: yield* db.AgentSession.where(rootSessions)
			.where((session) => session.id.in(originIds))
			.all(),
		voyages,
	});
});

export type QuayReadFailure = Effect.Error<ReturnType<typeof read>>;
