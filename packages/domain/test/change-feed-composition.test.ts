import { DomainFeeds } from "@antumbra/domain-feeds";
import { Pieces } from "@antumbra/pieces";
import { expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import { CREW, submittedChange, withHost } from "#test/change-submission-fixtures.ts";

it.live("linking another Piece to an active Change wakes Voyage readers", () =>
	withHost(() =>
		Effect.gen(function* () {
			const pieces = yield* Pieces;
			const feeds = yield* DomainFeeds;
			const { piece, repo, voyage } = yield* reefWithPiece;
			yield* berthed(CREW);
			const first = yield* submittedChange(piece.id, repo.name);
			const second = yield* pieces.charter({
				charter: "sound the western spit",
				dependsOn: [],
				expectation: "the sounding shares its change",
				role: "cartographer",
				title: "western sounding",
				voyageId: voyage.id,
			});

			const heard = yield* Effect.scoped(
				Effect.gen(function* () {
					const subscription = yield* feeds.subscribeVoyageRefresh();
					const linked = yield* submittedChange(second.id, repo.name);
					expect(linked.id).toBe(first.id);
					return yield* Stream.fromSubscription(subscription).pipe(Stream.take(1), Stream.runCollect);
				}),
			);
			expect(heard).toHaveLength(1);
		}),
	),
);
