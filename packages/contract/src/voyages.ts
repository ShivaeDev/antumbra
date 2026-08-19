import { BoardRegisterSchema } from "@antumbra/vocabulary/board";
import { Context, Data, type Effect, Schema, type Stream } from "effect";
import type { ArtifactMarkdown } from "#artifact-views.ts";
import type { QuayView } from "#quay-views.ts";
import type { SightFailure } from "#sight.ts";
import type {
	ChangeView,
	ReportMarkdown,
	VoyageSummary,
	VoyageView,
} from "#voyage-views.ts";

export const OpenVoyageRequest = Schema.Struct({
	backend: Schema.String,
	context: Schema.String,
	name: Schema.String,
	northStar: Schema.String,
});
export type OpenVoyageRequest = typeof OpenVoyageRequest.Type;

export const CharterPieceRequest = Schema.Struct({
	charter: Schema.String,
	dependsOn: Schema.Array(Schema.String),
	expectation: Schema.String,
	role: Schema.String,
	title: Schema.String,
	voyageId: Schema.String,
});
export type CharterPieceRequest = typeof CharterPieceRequest.Type;

export const RewireRequest = Schema.Struct({
	dependsOn: Schema.Array(Schema.String),
	pieceId: Schema.String,
});
export type RewireRequest = typeof RewireRequest.Type;

export const ArtifactSupersessionRequest = Schema.Struct({
	successorArtifactId: Schema.String,
	supersededArtifactId: Schema.String,
});
export type ArtifactSupersessionRequest =
	typeof ArtifactSupersessionRequest.Type;

export class ArtifactMarkdownFailure extends Data.TaggedError(
	"ArtifactMarkdownFailure",
)<{
	readonly message: string;
}> {}

// why: a board hangs off exactly one entity, so what it hangs off is a choice
// between named shapes rather than an id beside a kind that could disagree.
export const BoardTarget = Schema.Union([
	Schema.Struct({ kind: Schema.Literal("piece"), pieceId: Schema.String }),
	Schema.Struct({ kind: Schema.Literal("voyage"), voyageId: Schema.String }),
]);
export type BoardTarget = typeof BoardTarget.Type;

export const BoardWriteRequest = Schema.Struct({
	body: Schema.String,
	register: BoardRegisterSchema,
	scope: BoardTarget,
});
export type BoardWriteRequest = typeof BoardWriteRequest.Type;

// why: a change opened by hand is linked to its piece by url — the host is
// asked what it is, so the window sends what a person can read off a page.
export const AdoptChangeRequest = Schema.Struct({
	pieceId: Schema.String,
	repoName: Schema.String,
	url: Schema.String,
});
export type AdoptChangeRequest = typeof AdoptChangeRequest.Type;

export const HailReceipt = Schema.Struct({ agentId: Schema.String });
export type HailReceipt = typeof HailReceipt.Type;

export const CharterReceipt = Schema.Struct({ pieceId: Schema.String });
export type CharterReceipt = typeof CharterReceipt.Type;

export class VoyageSource extends Context.Service<
	VoyageSource,
	{
		readonly adoptChange: (
			request: AdoptChangeRequest,
		) => Effect.Effect<ChangeView, SightFailure>;
		readonly artifactMarkdown: (
			artifactId: string,
		) => Effect.Effect<ArtifactMarkdown, ArtifactMarkdownFailure>;
		readonly charterPiece: (
			request: CharterPieceRequest,
		) => Effect.Effect<CharterReceipt, SightFailure>;
		readonly hail: (
			voyageId: string,
		) => Effect.Effect<HailReceipt, SightFailure>;
		readonly launch: (pieceId: string) => Effect.Effect<void, SightFailure>;
		readonly open: (
			request: OpenVoyageRequest,
		) => Effect.Effect<VoyageSummary, SightFailure>;
		readonly park: (pieceId: string) => Effect.Effect<void, SightFailure>;
		readonly removeArtifactSupersession: (
			request: ArtifactSupersessionRequest,
		) => Effect.Effect<void, SightFailure>;
		readonly quay: Effect.Effect<QuayView, SightFailure>;
		readonly quayFeed: Stream.Stream<QuayView, SightFailure>;
		// why: the watcher is rung rather than waited on — what the pass costs
		// stays the cadence's decision, so this asks and never promises news.
		readonly refreshChanges: Effect.Effect<void, SightFailure>;
		readonly reportMarkdown: (
			reportId: string,
		) => Effect.Effect<ReportMarkdown, SightFailure>;
		readonly rewire: (
			request: RewireRequest,
		) => Effect.Effect<void, SightFailure>;
		readonly setFocus: (
			voyageId: string,
			focused: boolean,
		) => Effect.Effect<void, SightFailure>;
		readonly supersedeArtifact: (
			request: ArtifactSupersessionRequest,
		) => Effect.Effect<void, SightFailure>;
		readonly unpark: (pieceId: string) => Effect.Effect<void, SightFailure>;
		readonly voyage: (
			voyageId: string,
		) => Effect.Effect<VoyageView, SightFailure>;
		readonly voyageFeed: (
			voyageId: string,
		) => Stream.Stream<VoyageView, SightFailure>;
		readonly voyages: Effect.Effect<ReadonlyArray<VoyageSummary>, SightFailure>;
		readonly voyagesFeed: Stream.Stream<
			ReadonlyArray<VoyageSummary>,
			SightFailure
		>;
		readonly writeBoard: (
			request: BoardWriteRequest,
		) => Effect.Effect<void, SightFailure>;
	}
>()("@antumbra/contract/VoyageSource") {}
