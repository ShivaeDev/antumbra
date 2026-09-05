import type { SessionTree, SightFailure } from "@antumbra/contract";
import { DomainFeeds, type StoredEvent } from "@antumbra/domain-feeds";
import { SessionTrees } from "@antumbra/sessions/tree/service";
import { Effect, Stream } from "effect";
import { toFailure } from "#sight-failure.ts";

interface SightSessionTree {
	readonly sessionTree: (rootSessionId: string) => Effect.Effect<SessionTree, SightFailure>;
	readonly sessionTreeFeed: (rootSessionId: string) => Stream.Stream<SessionTree, SightFailure>;
}

const SHAPING: ReadonlySet<string> = new Set(["session.opened", "subsession.ended", "subsession.gap", "subsession.opened"]);

const shapesATree = (row: StoredEvent): boolean => SHAPING.has(row.kind);

export const makeSightSessionTree = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const trees = yield* SessionTrees;

	const sessionTree = (rootSessionId: string) => trees.read(rootSessionId).pipe(Effect.mapError(toFailure));

	return {
		sessionTree,
		// Subscribe before the first snapshot so a concurrent shaping event cannot be missed.
		sessionTreeFeed: (rootSessionId) =>
			Stream.unwrap(
				Effect.gen(function* () {
					const subscription = yield* feeds.subscribeSessionEvents();
					const current = yield* sessionTree(rootSessionId);
					const live = Stream.fromSubscription(subscription).pipe(
						Stream.filter(shapesATree),
						Stream.mapEffect(() => sessionTree(rootSessionId)),
					);
					return Stream.make(current).pipe(Stream.concat(live));
				}),
			),
	} satisfies SightSessionTree;
});
