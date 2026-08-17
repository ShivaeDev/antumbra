import type { ArtifactRow } from "@antumbra/artifacts";
import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import type { ReportRow } from "@antumbra/reports";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type {
	PieceRow,
	RepoRow,
	VoyageRow,
	VoyageWorld,
} from "#voyage-rows.ts";

// why: entity rows reach a reader whole, and the stored shape carries a
// createdAt the views have no use for, so each is projected onto its declared
// type here rather than leaking a field the interface never promised.
const voyageRow = (row: VoyageRow): VoyageRow => ({
	backend: row.backend,
	context: row.context,
	focusedAt: row.focusedAt,
	id: row.id,
	name: row.name,
	northStar: row.northStar,
});

const pieceRow = (row: PieceRow): PieceRow => ({
	charter: row.charter,
	expectation: row.expectation,
	id: row.id,
	launchedAt: row.launchedAt,
	parkedAt: row.parkedAt,
	role: row.role,
	title: row.title,
});

const reportRow = (row: ReportRow): ReportRow => ({
	authorAgentId: row.authorAgentId,
	body: row.body,
	id: row.id,
	title: row.title,
});

const repoRow = (row: RepoRow): RepoRow => ({ id: row.id, name: row.name });

const artifactRow = (row: ArtifactRow): ArtifactRow => ({
	authorAgentId: row.authorAgentId,
	id: row.id,
	title: row.title,
	uri: row.uri,
});

const byId = <A extends { readonly id: string }>(
	rows: ReadonlyArray<A>,
): ReadonlyMap<string, A> => new Map(rows.map((row) => [row.id, row]));

export const voyageWorld = (
	db: DatabaseService,
): Effect.Effect<VoyageWorld, PrismaError, WriteExecutors> =>
	Effect.gen(function* () {
		// why: read in the order they were born, so the map that carries them
		// keeps that order and the most recent of any set is its last entry.
		const agents = yield* db.Agent.orderBy((agent) =>
			agent.createdAt.asc(),
		).all();
		return {
			agentStatus: new Map(
				agents.map((agent) => [agent.id, agent.status] as const),
			),
			artifacts: byId((yield* db.Artifact.all()).map(artifactRow)),
			assignments: yield* db.PieceAgent.all(),
			changes: (yield* db.Change.orderBy((change) =>
				change.createdAt.asc(),
			).all()).map(changeRow),
			crews: yield* db.VoyageAgent.all(),
			edges: yield* db.PieceEdge.all(),
			memberships: yield* db.VoyagePiece.all(),
			pieceArtifacts: yield* db.PieceArtifact.all(),
			pieceChanges: (yield* db.PieceChange.all()).map(pieceChangeRow),
			pieceReports: yield* db.PieceReport.all(),
			pieces: (yield* db.Piece.orderBy((piece) =>
				piece.createdAt.asc(),
			).all()).map(pieceRow),
			reports: byId((yield* db.Report.all()).map(reportRow)),
			repos: byId((yield* db.Repo.all()).map(repoRow)),
			voyages: (yield* db.Voyage.orderBy((voyage) =>
				voyage.createdAt.asc(),
			).all()).map(voyageRow),
		} satisfies VoyageWorld;
	});

export const readVoyageWorld = (
	deps: AgentDeps,
): Effect.Effect<VoyageWorld, PrismaError> =>
	provideExecutors(deps)(voyageWorld(deps.db));
