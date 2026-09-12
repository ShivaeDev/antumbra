import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Repos } from "@antumbra/repos";
import { rootSessions } from "@antumbra/sessions";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { membershipsOf } from "#piece-reading.ts";
import { liesAtQuay } from "#quay/group.ts";
import { quayReading } from "#quay/view.ts";
import { byId } from "#voyage-row-projection.ts";

export const read = Effect.fn("Quay.read")(function* () {
	const changes = yield* Changes;
	const db = yield* Database;
	const repos = yield* Repos;
	const sailing = yield* Voyages;
	const berthed = yield* (yield* Pieces).list();
	const sailed = new Set(berthed.map((piece) => piece.voyageId));
	const voyages = (yield* sailing.list()).filter((voyage) => sailed.has(voyage.id));
	const voyageIds = new Set(voyages.map((voyage) => voyage.id));
	const pieces = berthed.filter((piece) => voyageIds.has(piece.voyageId));
	const memberships = membershipsOf(berthed);
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
