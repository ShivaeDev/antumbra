import { SettingsSource } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Stream } from "effect";
import { berthed, reefWithPiece } from "#test/change-fixtures.ts";
import { CREW, scriptedChangeHost, submittedChange } from "#test/change-submission-fixtures.ts";

it.effectApp.withProviders("linking another Piece to an active Change wakes Voyage readers", scriptedChangeHost, function* () {
	const settings = yield* SettingsSource;
	yield* settings.change({ key: "holdPieceDispatch", value: true });
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
});
