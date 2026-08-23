import { AgentBackendTagSchema } from "@antumbra/vocabulary/agent-backend";
import { BoardRegisterSchema } from "@antumbra/vocabulary/board";
import { PieceVerdict } from "@antumbra/vocabulary/verdict";
import { Schema } from "effect";

export const OpenVoyageRequest = Schema.Struct({
	backend: Schema.String,
	context: Schema.String,
	name: Schema.String,
	northStar: Schema.String,
});
export type OpenVoyageRequest = typeof OpenVoyageRequest.Type;

export const VoyageBackendRequest = Schema.Struct({
	backend: AgentBackendTagSchema,
	voyageId: Schema.String,
});
export type VoyageBackendRequest = typeof VoyageBackendRequest.Type;

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

// why: a change that died at its host is settled by naming it and nothing
// else — there is one verdict a dead change can be given.
export const DismissChangeRequest = Schema.Struct({ changeId: Schema.String });
export type DismissChangeRequest = typeof DismissChangeRequest.Type;

// why: the verdict travels as the admiral's word about a piece and nothing
// else — no state, no stamp. What the piece then reads as is derived on the
// far side, so a window that sent one still learns the answer from the feed.
export const PieceVerdictRequest = Schema.Struct({
	pieceId: Schema.String,
	verdict: PieceVerdict,
});
export type PieceVerdictRequest = typeof PieceVerdictRequest.Type;

export const HailReceipt = Schema.Struct({ agentId: Schema.String });
export type HailReceipt = typeof HailReceipt.Type;

// why: crew asked for by name answers the same way a hailed captain does —
// with the agent that was born for it, so the window can follow it.
export const CrewReceipt = Schema.Struct({ agentId: Schema.String });
export type CrewReceipt = typeof CrewReceipt.Type;

export const CharterReceipt = Schema.Struct({ pieceId: Schema.String });
export type CharterReceipt = typeof CharterReceipt.Type;
