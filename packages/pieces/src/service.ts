import type { PieceVerdict } from "@antumbra/platform-vocabulary/verdict.ts";
import { Context, type Effect, type Option } from "effect";
import type { CharterFailure, EdgeFailure, PieceNotFound } from "#errors.ts";
import type { CharterInput, EdgeRow, PieceRow } from "#model.ts";

export interface PiecesService {
	readonly assignAgent: (pieceId: string, agentId: string) => Effect.Effect<void>;
	readonly byId: (pieceId: string) => Effect.Effect<Option.Option<PieceRow>>;
	readonly byVoyage: (voyageId: string) => Effect.Effect<ReadonlyArray<PieceRow>>;
	readonly charter: (input: CharterInput) => Effect.Effect<PieceRow, CharterFailure>;
	readonly edges: (voyageId: string) => Effect.Effect<ReadonlyArray<EdgeRow>>;
	readonly landVerdict: (pieceId: string, verdict: PieceVerdict) => Effect.Effect<void, PieceNotFound>;
	readonly launch: (pieceId: string) => Effect.Effect<void, PieceNotFound>;
	readonly list: () => Effect.Effect<ReadonlyArray<PieceRow>>;
	readonly membersOfVoyage: (voyageId: string) => Effect.Effect<ReadonlySet<string>>;
	readonly park: (pieceId: string, parked: boolean) => Effect.Effect<void, PieceNotFound>;
	readonly setDependencies: (pieceId: string, dependsOn: ReadonlyArray<string>) => Effect.Effect<void, EdgeFailure>;
	readonly verdicts: (pieceIds: ReadonlyArray<string>) => Effect.Effect<ReadonlyMap<string, PieceVerdict>>;
	readonly verifyExists: (pieceId: string) => Effect.Effect<void, PieceNotFound>;
}

export class Pieces extends Context.Service<Pieces, PiecesService>()("@antumbra/pieces/Pieces") {}

export type { CharterInput, EdgeRow, PieceRow } from "#model.ts";
