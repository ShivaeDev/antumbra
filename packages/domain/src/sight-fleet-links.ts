import { Changes } from "@antumbra/changes";
import type { RepoSummary } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { WorkLinks } from "#agent-work.ts";

// why: the same links say which Changes an Agent answers for and which Pieces
// and voyages that work belongs to, so both readings are taken from one
// snapshot rather than from two reads that could name different rows. They
// are read beside the roster rather than inside it because they answer about
// the work, while the snapshot around them answers about the Agents.
export const fleetLinks = (repos: ReadonlyArray<RepoSummary>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const changes = yield* Changes;
		// why: the Changes an Agent is answering for are read through the
		// capability that owns them rather than off the rows — a situation
		// offered from a Change this snapshot never decoded would be an
		// affordance standing on unread truth.
		const snapshot = yield* changes.snapshot;
		const links: WorkLinks = {
			...snapshot,
			assignments: yield* db.PieceAgent.orderBy((assignment) =>
				assignment.assignedAt.asc(),
			).all(),
			crews: yield* db.VoyageAgent.all(),
			memberships: yield* db.VoyagePiece.all(),
			pieces: yield* db.Piece.all(),
			repos: new Map(repos.map((repo) => [repo.id, repo])),
			voyages: yield* db.Voyage.all(),
		};
		return links;
	});
