import { DomainFeeds } from "@antumbra/domain-feeds";
import { type WriteExecutors, Writer } from "@antumbra/persistence";
import { Effect, PubSub } from "effect";
import { makeCurrentSessionResumable } from "#current-session-resumable.ts";

export const makeCurrentSessionRecovery = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const reconcileResumableSession = yield* makeCurrentSessionResumable;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const announce = Effect.all(
		[
			PubSub.publish(feeds.fleet, undefined),
			PubSub.publish(feeds.voyages, undefined),
		],
		{ concurrency: 1 },
	).pipe(Effect.asVoid);
	const resumable = (sessionId: string) =>
		provide(writer.write(reconcileResumableSession(sessionId))).pipe(
			Effect.tap(({ changed }) => (changed ? announce : Effect.void)),
			Effect.map(({ session }) => session),
		);
	return { resumable };
});
