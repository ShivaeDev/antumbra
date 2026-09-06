import { BoardScope, Boards, localDay } from "@antumbra/boards";
import { Changes } from "@antumbra/changes";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Clock, Effect, Semaphore } from "effect";
import { SMOOTH_PIECE_TAG, SMOOTH_TAG, type SmoothFields, SmoothPayload, type SmoothPieceFields, SmoothPiecePayload } from "#smoothing/fields.ts";
import { makeSmoothingPasses } from "#smoothing/pass.ts";
import { concludedPiecesOf, makeSpannedPieces } from "#smoothing/pieces.ts";
import { makeSmootherAtHand, type SmoothRuntime } from "#smoothing/smoother.ts";

export const smoothingKinds = (runtime: SmoothRuntime) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const changes = yield* Changes;
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const pieces = yield* Pieces;
		const passes = yield* makeSmoothingPasses(runtime.sinkFor);
		const smootherFor = yield* makeSmootherAtHand(runtime);
		const spannedPieces = yield* makeSpannedPieces;
		const alone = yield* Semaphore.make(1);
		const smoothableOf = (voyageId: string) =>
			concludedPiecesOf([voyageId]).pipe(
				Effect.provideService(Changes, changes),
				Effect.provideService(Database, db),
				Effect.provideService(Pieces, pieces),
				Effect.flatMap(spannedPieces),
			);
		const daysToSmooth = (voyageId: string, throughToday: boolean) =>
			Effect.gen(function* () {
				const today = localDay(new Date(yield* Clock.currentTimeMillis));
				const uncovered = yield* boards.uncovered(BoardScope.Voyage({ voyageId }));
				return uncovered.filter((day) => throughToday || day.day < today);
			});
		const alongside = <E, R>(pass: Effect.Effect<void, E, R>) =>
			pass.pipe(
				alone.withPermits(1),
				Effect.onExit(() => feeds.publishVoyageRefresh()),
			);

		const smoothBoard = ({ throughToday, voyageId }: SmoothFields) =>
			alongside(
				Effect.gen(function* () {
					const smoother = yield* Effect.cached(smootherFor(voyageId));
					const settled = yield* smoothableOf(voyageId);
					yield* Effect.forEach(settled, (piece) => Effect.flatMap(smoother, (at) => passes.piece(at, piece)), { concurrency: 1, discard: true });
					const days = yield* daysToSmooth(voyageId, throughToday);
					yield* Effect.forEach(days, (day) => Effect.flatMap(smoother, (at) => passes.day(at, day)), { concurrency: 1, discard: true });
				}),
			);

		const smoothPiece = ({ pieceId, voyageId }: SmoothPieceFields) =>
			alongside(
				Effect.gen(function* () {
					const settled = (yield* smoothableOf(voyageId)).filter((piece) => piece.pieceId === pieceId);
					yield* Effect.forEach(settled, (piece) => Effect.flatMap(smootherFor(voyageId), (at) => passes.piece(at, piece)), {
						concurrency: 1,
						discard: true,
					});
				}),
			);

		return {
			smooth: defineIntent({ execute: smoothBoard, payload: SmoothPayload, reclaim: "requeue", tag: SMOOTH_TAG }),
			smoothPiece: defineIntent({ execute: smoothPiece, payload: SmoothPiecePayload, reclaim: "requeue", tag: SMOOTH_PIECE_TAG }),
		};
	});
