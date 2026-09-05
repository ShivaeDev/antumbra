import type { ArtifactFailure, ArtifactInput, ArtifactLanding, ArtifactMarkdown, ArtifactSupersessionInput } from "@antumbra/artifacts";
import type { PrismaError } from "@antumbra/persistence";
import type { CharterFailure, CharterInput, EdgeWouldCycle, PieceNotFound, PieceRow, PieceVerdict } from "@antumbra/pieces";
import type { ReportInput, ReportReading, ReportRow } from "@antumbra/reports";
import type { AgentBackendTag } from "@antumbra/vocabulary/agent-backend";
import { Context, type Effect, type Option } from "effect";
import type { VoyageNotFound } from "#errors.ts";
import type { HailedCaptain, HailRefused } from "#hail.ts";
import type { CrewedPiece, WorkRefused } from "#piece-work/work.ts";
import type { VoyageRow } from "#voyage-rows.ts";
import type { VoyageSummary, VoyageView } from "#voyage-view.ts";
import type { VoyageWorldReadFailure } from "#voyage-world/read.ts";

export interface OpenVoyageInput {
	readonly backend: string;
	readonly context: string;
	readonly focused?: boolean;
	readonly name: string;
	readonly northStar: string;
}

export interface VoyageProcedures {
	readonly artifactMarkdown: (artifactId: string) => Effect.Effect<ArtifactMarkdown, ArtifactFailure>;
	readonly charterPiece: (input: CharterInput) => Effect.Effect<PieceRow, CharterFailure>;
	readonly hail: (voyageId: string) => Effect.Effect<HailedCaptain, HailRefused>;
	readonly landArtifact: (input: ArtifactInput) => Effect.Effect<ArtifactLanding, ArtifactFailure>;
	readonly landPieceVerdict: (pieceId: string, verdict: PieceVerdict) => Effect.Effect<void, PieceNotFound | PrismaError>;
	readonly landReport: (input: ReportInput) => Effect.Effect<ReportRow, PieceNotFound | PrismaError>;
	readonly readReport: (reportId: string) => Effect.Effect<Option.Option<ReportReading>, PrismaError>;
	readonly removeArtifactSupersession: (input: Omit<ArtifactSupersessionInput, "actor">) => Effect.Effect<void, ArtifactFailure>;
	readonly launch: (pieceId: string) => Effect.Effect<void, PieceNotFound | PrismaError>;
	readonly list: Effect.Effect<ReadonlyArray<VoyageSummary>, VoyageWorldReadFailure>;
	readonly open: (input: OpenVoyageInput) => Effect.Effect<VoyageRow, PrismaError>;
	readonly park: (pieceId: string) => Effect.Effect<void, PieceNotFound | PrismaError>;
	readonly read: (voyageId: string) => Effect.Effect<Option.Option<VoyageView>, VoyageWorldReadFailure>;
	readonly rewire: (pieceId: string, dependsOn: ReadonlyArray<string>) => Effect.Effect<void, EdgeWouldCycle | PieceNotFound | PrismaError>;
	readonly setCaptainBackend: (voyageId: string, backend: AgentBackendTag) => Effect.Effect<void, PrismaError | VoyageNotFound>;
	readonly setCrewBackend: (voyageId: string, backend: AgentBackendTag) => Effect.Effect<void, PrismaError | VoyageNotFound>;
	readonly setFocus: (voyageId: string, focused: boolean) => Effect.Effect<void, PrismaError | VoyageNotFound>;
	readonly supersedeArtifact: (input: Omit<ArtifactSupersessionInput, "actor">) => Effect.Effect<void, ArtifactFailure>;
	readonly unpark: (pieceId: string) => Effect.Effect<void, PieceNotFound | PrismaError>;
	readonly workNow: (pieceId: string) => Effect.Effect<CrewedPiece, WorkRefused>;
}

export class VoyageProcedureService extends Context.Service<VoyageProcedureService, VoyageProcedures>()("@antumbra/domain/VoyageProcedures") {}
