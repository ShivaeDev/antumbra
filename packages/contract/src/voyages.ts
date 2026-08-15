import { Context, type Effect, Schema, type Stream } from "effect";
import type { SightFailure } from "#sight.ts";
import type { VoyageSummary, VoyageView } from "#voyage-views.ts";

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

// why: a board hangs off exactly one entity, so what it hangs off is a choice
// between named shapes rather than an id beside a kind that could disagree.
export const BoardTarget = Schema.Union([
	Schema.Struct({ kind: Schema.Literal("piece"), pieceId: Schema.String }),
	Schema.Struct({ kind: Schema.Literal("voyage"), voyageId: Schema.String }),
]);
export type BoardTarget = typeof BoardTarget.Type;

export const BoardWriteRequest = Schema.Struct({
	body: Schema.String,
	register: Schema.Literals(["rough", "smooth"]),
	scope: BoardTarget,
});
export type BoardWriteRequest = typeof BoardWriteRequest.Type;

export const HailReceipt = Schema.Struct({ agentId: Schema.String });
export type HailReceipt = typeof HailReceipt.Type;

export const CharterReceipt = Schema.Struct({ pieceId: Schema.String });
export type CharterReceipt = typeof CharterReceipt.Type;

export class VoyageSource extends Context.Service<
	VoyageSource,
	{
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
		readonly rewire: (
			request: RewireRequest,
		) => Effect.Effect<void, SightFailure>;
		readonly setFocus: (
			voyageId: string,
			focused: boolean,
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
