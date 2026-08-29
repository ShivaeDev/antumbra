import type { ArtifactRow } from "@antumbra/artifacts";
import type { ReportRow } from "@antumbra/reports";
import type { VoyageKind } from "@antumbra/vocabulary/voyage";
import type { PieceRow, RepoRow, VoyageRow } from "#voyage-rows.ts";

// why: entity rows reach a reader whole, and the stored shape carries fields
// the views have no use for. Each projection declares exactly what survives.
export const voyageRow = (
	row: Omit<VoyageRow, "kind">,
	kind: VoyageKind,
): VoyageRow => ({
	backend: row.backend,
	context: row.context,
	focusedAt: row.focusedAt,
	id: row.id,
	kind,
	name: row.name,
	northStar: row.northStar,
});

export const pieceRow = (row: PieceRow): PieceRow => ({
	charter: row.charter,
	expectation: row.expectation,
	id: row.id,
	launchedAt: row.launchedAt,
	parkedAt: row.parkedAt,
	role: row.role,
	title: row.title,
});

export const reportRow = (row: ReportRow): ReportRow => ({
	authorAgentId: row.authorAgentId,
	body: row.body,
	id: row.id,
	title: row.title,
});

export const repoRow = (row: RepoRow): RepoRow => ({
	id: row.id,
	name: row.name,
});

export const artifactRow = (row: ArtifactRow): ArtifactRow => ({
	authorAgentId: row.authorAgentId,
	basename: row.basename,
	byteSize: row.byteSize,
	digest: row.digest,
	id: row.id,
	pieceId: row.pieceId,
	supersededByArtifactId: row.supersededByArtifactId,
	title: row.title,
});

export const byId = <A extends { readonly id: string }>(
	rows: ReadonlyArray<A>,
): ReadonlyMap<string, A> => new Map(rows.map((row) => [row.id, row]));
