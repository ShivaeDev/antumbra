import {
	decodeStoredAgentSessionStatus,
	decodeStoredAgentStatus,
	type StoredAgentSessionStatusInvalid,
	type StoredAgentStatusInvalid,
} from "@antumbra/agent-runtime-vocabulary";
import {
	type StoredArtifactLineageInvalid,
	validateStoredArtifactLineage,
} from "@antumbra/artifacts";
import {
	Database,
	type PrismaError,
	type WriteExecutors,
} from "@antumbra/persistence";
import { Context, Effect, Layer } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import type { StoredChangeInvalid, StoredPieceChangeInvalid } from "#errors.ts";
import {
	decodeSessionExecutionStatus,
	type InvalidSessionExecutionStatus,
} from "#session-execution-status.ts";
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
	| StoredPieceChangeInvalid;

export class VoyageWorldSource extends Context.Service<
	VoyageWorldSource,
	{
		readonly read: Effect.Effect<VoyageWorld, VoyageWorldReadFailure>;
	}
>()("@antumbra/domain/VoyageWorldSource") {}

const voyageWorld: Effect.Effect<
	VoyageWorld,
	VoyageWorldReadFailure,
	Context.Service.Identifier<typeof Database> | WriteExecutors
> = Effect.gen(function* () {
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
	const changes = yield* Effect.forEach(
		yield* db.Change.orderBy((change) => change.createdAt.asc()).all(),
		changeRow,
	);
	const pieceChanges = yield* Effect.forEach(
		yield* db.PieceChange.all(),
		pieceChangeRow,
	);
	const sessions = yield* Effect.forEach(
		yield* db.AgentSession.all(),
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
		edges: yield* db.PieceEdge.all(),
		memberships: yield* db.VoyagePiece.all(),
		pieceChanges,
		pieceReports: yield* db.PieceReport.all(),
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
		const db = yield* Database;
		const executors = yield* Effect.context<WriteExecutors>();
		const read = voyageWorld.pipe(
			Effect.provideService(Database, db),
			Effect.provideContext(executors),
		);
		return { read };
	}),
);
