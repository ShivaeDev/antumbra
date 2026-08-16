import type {
	ArtifactFailure,
	ArtifactInput,
	ArtifactRow,
} from "@antumbra/artifacts";
import type { PrismaError } from "@antumbra/persistence";
import type {
	CharterFailure,
	CharterInput,
	EdgeWouldCycle,
	PieceNotFound,
	PieceRow,
} from "@antumbra/pieces";
import type { ReportInput, ReportRow } from "@antumbra/reports";
import type { Effect, Option } from "effect";
import type {
	StoredChangeInvalid,
	StoredPieceChangeInvalid,
	VoyageNotFound,
} from "#errors.ts";
import type { HailedCaptain, HailRefused } from "#hail.ts";
import type { InvalidSessionExecutionStatus } from "#session-execution-status.ts";
import type { VoyageRow } from "#voyage-rows.ts";
import type { VoyageSummary, VoyageView } from "#voyage-view.ts";

export interface OpenVoyageInput {
	readonly backend: string;
	readonly context: string;
	readonly focused?: boolean;
	readonly name: string;
	readonly northStar: string;
}

export interface VoyageProcedures {
	readonly charterPiece: (
		input: CharterInput,
	) => Effect.Effect<PieceRow, CharterFailure>;
	readonly hail: (
		voyageId: string,
	) => Effect.Effect<HailedCaptain, HailRefused>;
	readonly landArtifact: (
		input: ArtifactInput,
	) => Effect.Effect<ArtifactRow, ArtifactFailure>;
	readonly landReport: (
		input: ReportInput,
	) => Effect.Effect<ReportRow, PieceNotFound | PrismaError>;
	readonly launch: (
		pieceId: string,
	) => Effect.Effect<void, PieceNotFound | PrismaError>;
	readonly list: Effect.Effect<
		ReadonlyArray<VoyageSummary>,
		| InvalidSessionExecutionStatus
		| PrismaError
		| StoredChangeInvalid
		| StoredPieceChangeInvalid
	>;
	readonly open: (
		input: OpenVoyageInput,
	) => Effect.Effect<VoyageRow, PrismaError>;
	readonly park: (
		pieceId: string,
	) => Effect.Effect<void, PieceNotFound | PrismaError>;
	readonly read: (
		voyageId: string,
	) => Effect.Effect<
		Option.Option<VoyageView>,
		| InvalidSessionExecutionStatus
		| PrismaError
		| StoredChangeInvalid
		| StoredPieceChangeInvalid
	>;
	readonly rewire: (
		pieceId: string,
		dependsOn: ReadonlyArray<string>,
	) => Effect.Effect<void, EdgeWouldCycle | PieceNotFound | PrismaError>;
	readonly setFocus: (
		voyageId: string,
		focused: boolean,
	) => Effect.Effect<void, PrismaError | VoyageNotFound>;
	readonly unpark: (
		pieceId: string,
	) => Effect.Effect<void, PieceNotFound | PrismaError>;
}
