import type { PrismaError } from "@antumbra/persistence";
import type { PieceNotFound } from "@antumbra/pieces";
import type { ChangeHostError, RunnerError } from "@antumbra/plugin-api";
import type {
	ChangeIdentityCollision,
	ChangeObservationConflict,
	PreparedChangeInvalid,
} from "#change-submissions/errors.ts";
import type {
	BerthNotFound,
	NoChangeHost,
	RepoNotFound,
	StoredChangeInvalid,
	UnknownChangeHostTag,
	UnknownRunnerTag,
} from "#errors.ts";

export interface SubmitChangeInput {
	readonly agentId: string;
	readonly pieceId: string;
	readonly repoName: string;
}

export interface AdoptChangeInput {
	readonly agentId: string | null;
	readonly pieceId: string;
	readonly repoName: string;
	readonly url: string;
}

export interface OpenChangeInput extends SubmitChangeInput {
	readonly base: string | null;
	readonly body: string;
	readonly draft: boolean;
	readonly title: string;
}

export type SubmitChangeFailure =
	| BerthNotFound
	| NoChangeHost
	| PieceNotFound
	| PrismaError
	| RepoNotFound
	| RunnerError
	| StoredChangeInvalid
	| UnknownRunnerTag;

export type AdoptChangeFailure =
	| ChangeHostError
	| ChangeIdentityCollision
	| ChangeObservationConflict
	| NoChangeHost
	| PieceNotFound
	| PrismaError
	| RepoNotFound
	| StoredChangeInvalid;

export type OpenChangeFailure =
	| ChangeHostError
	| ChangeIdentityCollision
	| ChangeObservationConflict
	| PreparedChangeInvalid
	| SubmitChangeFailure
	| UnknownChangeHostTag;

export interface Proposal {
	readonly base: string | null;
	readonly body: string;
	readonly draft: boolean;
	readonly title: string;
}

export interface RepoBerth {
	readonly branch: string;
	readonly path: string;
	readonly runner: string;
	readonly slug: string;
	readonly source: string;
}
