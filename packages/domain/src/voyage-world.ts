import {
	type StoredArtifactLineageInvalid,
	validateStoredArtifactLineage,
} from "@antumbra/artifacts";
import {
	Changes,
	type StoredChangeInvalid,
	type StoredChangeVerdictInvalid,
	type StoredPieceChangeInvalid,
} from "@antumbra/changes";
import { Database, type PrismaError } from "@antumbra/persistence";
import {
	readPieceVerdicts,
	type StoredPieceVerdictInvalid,
} from "@antumbra/pieces";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	type InvalidSessionExecutionStatus,
	type StoredAgentSessionStatusInvalid,
	type StoredAgentStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime";
import { Context, Effect, Layer } from "effect";
import { rootSessions } from "#session-roots.ts";
import {
	artifactRow,
	byId,
	pieceRow,
	repoRow,
	reportRow,
	voyageRow,
} from "#voyage-row-projection.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export type VoyageWorldReadFailure =
	| InvalidSessionExecutionStatus
	| PrismaError
	| StoredArtifactLineageInvalid
	| StoredAgentSessionStatusInvalid
	| StoredAgentStatusInvalid
	| StoredChangeInvalid
	| StoredChangeVerdictInvalid
	| StoredPieceChangeInvalid
	| StoredPieceVerdictInvalid;

export class VoyageWorldSource extends Context.Service<
	VoyageWorldSource,
	{
		readonly read: Effect.Effect<VoyageWorld, VoyageWorldReadFailure>;
	}
>()("@antumbra/domain/VoyageWorldSource") {}

const voyageWorld: Effect.Effect<
	VoyageWorld,
	VoyageWorldReadFailure,
	Changes | Context.Service.Identifier<typeof Database>
> = Effect.gen(function* () {
	const changeSnapshot = yield* Changes;
	const db = yield* Database;
	// why: read in the order they were born, so the map that carries them
	// keeps that order and the most recent of any set is its last entry.
	const agents = yield* db.Agent.orderBy((agent) =>
		agent.createdAt.asc(),
	).all();
	const agentStatuses = yield* Effect.forEach(agents, (agent) =>
		Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(
			Effect.map((status) => [agent.id, status] as const),
		),
	);
	const { changes, dismissedChangeIds, pieceChanges } =
		yield* changeSnapshot.snapshot;
	const sessions = yield* Effect.forEach(
		yield* db.AgentSession.where(rootSessions).all(),
		(session) =>
			Effect.all({
				executionStatus: Effect.fromResult(
					decodeSessionExecutionStatus(session.id, session.executionStatus),
				),
				status: Effect.fromResult(
					decodeStoredAgentSessionStatus(session.id, session.status),
				),
			}).pipe(
				Effect.map(({ executionStatus, status }) => ({
					agentId: session.agentId,
					createdAt: session.createdAt,
					executionStatus,
					id: session.id,
					status,
				})),
			),
	);
	const artifacts = (yield* db.Artifact.all()).map(artifactRow);
	const pieces = (yield* db.Piece.orderBy((piece) =>
		piece.createdAt.asc(),
	).all()).map(pieceRow);
	yield* validateStoredArtifactLineage({
		artifacts,
		pieceIds: new Set(pieces.map((piece) => piece.id)),
	});
	return {
		agentStatus: new Map(agentStatuses),
		currentSessionByAgent: new Map(
			agents.map((agent) => [agent.id, agent.currentSessionId] as const),
		),
		artifacts: byId(artifacts),
		assignments: yield* db.PieceAgent.all(),
		changes,
		crews: yield* db.VoyageAgent.all(),
		dismissedChangeIds,
		edges: yield* db.PieceEdge.all(),
		memberships: yield* db.VoyagePiece.all(),
		pieceChanges,
		pieceReports: yield* db.PieceReport.all(),
		pieceVerdicts: yield* readPieceVerdicts,
		pieces,
		reports: byId((yield* db.Report.all()).map(reportRow)),
		repos: byId((yield* db.Repo.all()).map(repoRow)),
		sessions,
		voyages: (yield* db.Voyage.orderBy((voyage) =>
			voyage.createdAt.asc(),
		).all()).map(voyageRow),
	} satisfies VoyageWorld;
});

export const VoyageWorldSourceLive = Layer.effect(VoyageWorldSource)(
	Effect.gen(function* () {
		const changes = yield* Changes;
		const db = yield* Database;
		const read = voyageWorld.pipe(
			Effect.provideService(Changes, changes),
			Effect.provideService(Database, db),
		);
		return { read };
	}),
);
