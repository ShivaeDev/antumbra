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
	const snapshot = yield* changes.snapshot();
	const originIds = snapshot.changes.flatMap((change) =>
		liesAtQuay(snapshot, change) && change.originSessionId !== null && change.openedByAgentId !== null ? [change.originSessionId] : [],
	);
	return quayReading({
		...snapshot,
		memberships: yield* db.VoyagePiece.all(),
		pieces: yield* db.Piece.orderBy((piece) => piece.createdAt.asc()).all(),
		repos: byId(yield* repos.registered()),
		sessions: yield* db.AgentSession.where(rootSessions)
			.where((session) => session.id.in(originIds))
			.all(),
		voyages: yield* db.Voyage.orderBy((voyage) => voyage.createdAt.asc()).all(),
	});
});

export type QuayReadFailure = Effect.Error<ReturnType<typeof read>>;
