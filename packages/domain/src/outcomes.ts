import type { PrismaError } from "@antumbra/persistence";
import { Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { PieceNotFound } from "#errors.ts";
import type { ArtifactRow, ReportRow } from "#voyage-rows.ts";

export interface ReportInput {
	readonly authorAgentId?: string;
	readonly body: string;
	readonly pieceId: string;
	readonly title: string;
}

export interface ArtifactInput {
	readonly authorAgentId?: string;
	readonly pieceId: string;
	readonly title: string;
	readonly uri: string;
}

type LandFailure = PieceNotFound | PrismaError;

// why: landing is the only way a piece becomes done, so the piece must exist
// before an outcome can point at it — an orphan link would read as a done
// piece nobody chartered.
const requirePiece = (deps: AgentDeps, pieceId: string) =>
	provideExecutors(deps)(deps.db.Piece.where({ id: pieceId }).first()).pipe(
		Effect.flatMap((row) =>
			Option.isNone(row) ? new PieceNotFound({ pieceId }) : Effect.void,
		),
	);

export const landReport = (
	deps: AgentDeps,
	input: ReportInput,
): Effect.Effect<ReportRow, LandFailure> =>
	Effect.gen(function* () {
		yield* requirePiece(deps, input.pieceId);
		const row: ReportRow = {
			authorAgentId: input.authorAgentId ?? null,
			body: input.body,
			id: crypto.randomUUID(),
			title: input.title,
		};
		yield* provideExecutors(deps)(
			deps.writer.write(
				deps.db.Report.create(row).pipe(
					Effect.andThen(
						deps.db.PieceReport.create({
							pieceId: input.pieceId,
							reportId: row.id,
						}),
					),
				),
			),
		);
		yield* PubSub.publish(deps.feeds.voyages, undefined);
		return row;
	});

export const landArtifact = (
	deps: AgentDeps,
	input: ArtifactInput,
): Effect.Effect<ArtifactRow, LandFailure> =>
	Effect.gen(function* () {
		yield* requirePiece(deps, input.pieceId);
		const row: ArtifactRow = {
			authorAgentId: input.authorAgentId ?? null,
			id: crypto.randomUUID(),
			title: input.title,
			uri: input.uri,
		};
		yield* provideExecutors(deps)(
			deps.writer.write(
				deps.db.Artifact.create(row).pipe(
					Effect.andThen(
						deps.db.PieceArtifact.create({
							artifactId: row.id,
							pieceId: input.pieceId,
						}),
					),
				),
			),
		);
		yield* PubSub.publish(deps.feeds.voyages, undefined);
		return row;
	});
