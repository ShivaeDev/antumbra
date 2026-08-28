import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import type { PieceVerdict } from "@antumbra/vocabulary/verdict";
import { Context, Effect, Layer } from "effect";
import { charter } from "#charter.ts";
import type { CharterFailure, EdgeFailure, PieceNotFound } from "#errors.ts";
import { landVerdict } from "#land-verdict.ts";
import { launch } from "#launch.ts";
import type { CharterInput, PieceRow } from "#model.ts";
import { park } from "#park.ts";
import { verifyPieceExists } from "#rows.ts";
import { setDependencies } from "#set-dependencies.ts";
import { memberPieceIds } from "#voyage-membership.ts";

export class Pieces extends Context.Service<
	Pieces,
	{
		readonly charter: (
			input: CharterInput,
		) => Effect.Effect<PieceRow, CharterFailure>;
		// why: an outcome the admiral lands by hand, for the piece no crew can
		// finish saying anything about. It joins the tally; it never sets a state.
		readonly landVerdict: (
			pieceId: string,
			verdict: PieceVerdict,
		) => Effect.Effect<void, PieceNotFound | PrismaError>;
		readonly launch: (
			pieceId: string,
		) => Effect.Effect<void, PieceNotFound | PrismaError>;
		readonly membersOfVoyage: (
			voyageId: string,
		) => Effect.Effect<ReadonlySet<string>, PrismaError>;
		readonly park: (
			pieceId: string,
			parked: boolean,
		) => Effect.Effect<void, PieceNotFound | PrismaError>;
		readonly verifyExists: (
			pieceId: string,
		) => Effect.Effect<void, PieceNotFound | PrismaError>;
		readonly setDependencies: (
			pieceId: string,
			dependsOn: ReadonlyArray<string>,
		) => Effect.Effect<void, EdgeFailure>;
	}
>()("@antumbra/pieces/Pieces") {}

export const PiecesLive = Layer.effect(Pieces)(
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const context = Context.make(Database, db).pipe(
			Context.add(DomainFeeds, feeds),
		);
		return {
			charter: (input) => Effect.provide(charter(input), context),
			landVerdict: (pieceId, verdict) =>
				Effect.provide(landVerdict(pieceId, verdict), context),
			launch: (pieceId) => Effect.provide(launch(pieceId), context),
			membersOfVoyage: (voyageId) =>
				Effect.provide(memberPieceIds(voyageId), context),
			park: (pieceId, parked) => Effect.provide(park(pieceId, parked), context),
			setDependencies: (pieceId, dependsOn) =>
				Effect.provide(setDependencies(pieceId, dependsOn), context),
			verifyExists: (pieceId) =>
				Effect.provide(verifyPieceExists(pieceId), context),
		};
	}),
);
