import { Changes } from "@antumbra/changes";
import { Database } from "@antumbra/persistence";
import { readPieceVerdicts } from "@antumbra/pieces";
import { Repos } from "@antumbra/repos";
import { Rulings } from "@antumbra/rulings";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { byId } from "#voyage-row-projection.ts";
import type { VoyageWorld } from "#voyage-rows.ts";
import { readRootSessions } from "#voyage-world/root-sessions.ts";
import { readVoyages } from "#voyage-world/voyages.ts";

export const read = Effect.fn("VoyageWorldSource.read")(function* () {
	const changeSnapshot = yield* Changes;
	const db = yield* Database;
	const rulings = yield* Rulings;
	const repos = yield* Repos;
	const agents = yield* db.Agent.orderBy((agent) => agent.createdAt.asc()).all();
	const agentStatuses = yield* Effect.forEach(agents, (agent) =>
		Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(Effect.map((status) => [agent.id, status] as const)),
	);
	const { changes, dismissedChangeIds, pieceChanges } = yield* changeSnapshot.snapshot();
	const artifacts = yield* db.Artifact.all();
	const pieces = yield* db.Piece.orderBy((piece) => piece.createdAt.asc()).all();
	return {
		agentStatus: new Map(agentStatuses),
		currentSessionByAgent: new Map(agents.map((agent) => [agent.id, agent.currentSessionId] as const)),
		artifacts: byId(artifacts),
		assignments: yield* db.PieceAgent.all(),
		changes,
		crews: yield* db.VoyageAgent.all(),
		dismissedChangeIds,
		edges: yield* db.PieceEdge.all(),
		memberships: yield* db.VoyagePiece.all(),
		openRulings: yield* rulings.open(),
		pieceChanges,
		pieceReports: yield* db.PieceReport.all(),
		pieceVerdicts: yield* readPieceVerdicts,
		pieces,
		reports: byId(yield* db.Report.all()),
		repos: byId(yield* repos.registered()),
		rulingGates: yield* rulings.openGates(),
		sessions: yield* readRootSessions(),
		voyages: yield* readVoyages(),
	} satisfies VoyageWorld;
});

export type VoyageWorldReadFailure = Effect.Error<ReturnType<typeof read>>;
