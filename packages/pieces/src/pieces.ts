import { DomainFeeds } from "@antumbra/domain-feeds";
import {
	Database,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import { Context, Effect, Layer } from "effect";
import { charter } from "#charter.ts";
import type { CharterFailure, EdgeFailure, PieceNotFound } from "#errors.ts";
import { launch } from "#launch.ts";
import type { CharterInput, PieceRow } from "#model.ts";
import { park } from "#park.ts";
import { setDependencies } from "#set-dependencies.ts";

export class Pieces extends Context.Service<
	Pieces,
	{
		readonly charter: (
			input: CharterInput,
		) => Effect.Effect<PieceRow, CharterFailure>;
		readonly launch: (
			pieceId: string,
		) => Effect.Effect<void, PieceNotFound | PrismaError>;
		readonly park: (
			pieceId: string,
			parked: boolean,
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
		const writer = yield* Writer;
		const feeds = yield* DomainFeeds;
		const executors = yield* Effect.context<WriteExecutors>();
		const context = Context.merge(
			executors,
			Context.make(Database, db).pipe(
				Context.add(Writer, writer),
				Context.add(DomainFeeds, feeds),
			),
		);
		return {
			charter: (input) => Effect.provide(charter(input), context),
			launch: (pieceId) => Effect.provide(launch(pieceId), context),
			park: (pieceId, parked) => Effect.provide(park(pieceId, parked), context),
			setDependencies: (pieceId, dependsOn) =>
				Effect.provide(setDependencies(pieceId, dependsOn), context),
		};
	}),
);
