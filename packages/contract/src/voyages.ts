import { Context, Data, type Effect, type Stream } from "effect";
import type { ArtifactMarkdown } from "#artifact-views.ts";
import type { ChangeView } from "#change-views.ts";
import type { QuayView } from "#quay-views.ts";
import type { SightFailure } from "#sight.ts";
import type {
	AdoptChangeRequest,
	ArtifactSupersessionRequest,
	BoardWriteRequest,
	CharterPieceRequest,
	CharterReceipt,
	CrewReceipt,
	HailReceipt,
	OpenVoyageRequest,
	PieceVerdictRequest,
	RewireRequest,
	VoyageAgentSettingsRequest,
} from "#voyage-requests.ts";
import type { ReportMarkdown, VoyageSummary, VoyageView } from "#voyage-views.ts";

export class ArtifactMarkdownFailure extends Data.TaggedError("ArtifactMarkdownFailure")<{
	readonly message: string;
}> {}

export class VoyageSource extends Context.Service<
	VoyageSource,
	{
		readonly adoptChange: (request: AdoptChangeRequest) => Effect.Effect<ChangeView, SightFailure>;
		readonly artifactMarkdown: (artifactId: string) => Effect.Effect<ArtifactMarkdown, ArtifactMarkdownFailure>;
		readonly charterPiece: (request: CharterPieceRequest) => Effect.Effect<CharterReceipt, SightFailure>;
		readonly dismissChange: (changeId: string) => Effect.Effect<void, SightFailure>;
		readonly hail: (voyageId: string) => Effect.Effect<HailReceipt, SightFailure>;
		readonly landPieceVerdict: (request: PieceVerdictRequest) => Effect.Effect<void, SightFailure>;
		readonly launch: (pieceId: string) => Effect.Effect<void, SightFailure>;
		readonly open: (request: OpenVoyageRequest) => Effect.Effect<VoyageSummary, SightFailure>;
		readonly park: (pieceId: string) => Effect.Effect<void, SightFailure>;
		readonly removeArtifactSupersession: (request: ArtifactSupersessionRequest) => Effect.Effect<void, SightFailure>;
		readonly quay: Effect.Effect<QuayView, SightFailure>;
		readonly quayFeed: Stream.Stream<QuayView, SightFailure>;
		readonly refreshChanges: Effect.Effect<void, SightFailure>;
		readonly reportMarkdown: (reportId: string) => Effect.Effect<ReportMarkdown, SightFailure>;
		readonly rewire: (request: RewireRequest) => Effect.Effect<void, SightFailure>;
		readonly setAgentSettings: (request: VoyageAgentSettingsRequest) => Effect.Effect<void, SightFailure>;
		readonly setFocus: (voyageId: string, focused: boolean) => Effect.Effect<void, SightFailure>;
		readonly smoothBoard: (voyageId: string) => Effect.Effect<void, SightFailure>;
		readonly supersedeArtifact: (request: ArtifactSupersessionRequest) => Effect.Effect<void, SightFailure>;
		readonly unpark: (pieceId: string) => Effect.Effect<void, SightFailure>;
		readonly voyage: (voyageId: string) => Effect.Effect<VoyageView, SightFailure>;
		readonly voyageFeed: (voyageId: string) => Stream.Stream<VoyageView, SightFailure>;
		readonly voyages: Effect.Effect<ReadonlyArray<VoyageSummary>, SightFailure>;
		readonly voyagesFeed: Stream.Stream<ReadonlyArray<VoyageSummary>, SightFailure>;
		readonly workPieceNow: (pieceId: string) => Effect.Effect<CrewReceipt, SightFailure>;
		readonly writeBoard: (request: BoardWriteRequest) => Effect.Effect<void, SightFailure>;
	}
>()("@antumbra/contract/VoyageSource") {}
