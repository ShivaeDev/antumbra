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
export type ArtifactSupersessionRequest = typeof ArtifactSupersessionRequest.Type;

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

export const AdoptChangeRequest = Schema.Struct({
	pieceId: Schema.String,
	repoName: Schema.String,
	url: Schema.String,
});
export type AdoptChangeRequest = typeof AdoptChangeRequest.Type;

export const DismissChangeRequest = Schema.Struct({ changeId: Schema.String });
export type DismissChangeRequest = typeof DismissChangeRequest.Type;

export const PieceVerdictRequest = Schema.Struct({
	pieceId: Schema.String,
	verdict: PieceVerdict,
});
export type PieceVerdictRequest = typeof PieceVerdictRequest.Type;

export const HailReceipt = Schema.Struct({ agentId: Schema.String });
export type HailReceipt = typeof HailReceipt.Type;

export const CrewReceipt = Schema.Struct({ agentId: Schema.String });
export type CrewReceipt = typeof CrewReceipt.Type;

export const CharterReceipt = Schema.Struct({ pieceId: Schema.String });
export type CharterReceipt = typeof CharterReceipt.Type;
