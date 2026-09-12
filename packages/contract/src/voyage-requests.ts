import { BoardRegisterSchema } from "@antumbra/platform-vocabulary/board.ts";
import { Schema } from "effect";

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

export const HailReceipt = Schema.Struct({ agentId: Schema.String });
export type HailReceipt = typeof HailReceipt.Type;

export const CrewReceipt = Schema.Struct({ agentId: Schema.String });
export type CrewReceipt = typeof CrewReceipt.Type;

