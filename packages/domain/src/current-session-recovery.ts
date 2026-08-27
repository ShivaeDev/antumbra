import { DomainFeeds } from "@antumbra/domain-feeds";
import { type WriteExecutors, Writer } from "@antumbra/persistence";
import { Effect } from "effect";
import { makeCurrentSessionResumable } from "#current-session-resumable.ts";
import { makeCurrentSessionWake } from "#current-session-wake.ts";

export const makeCurrentSessionRecovery = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const reconcileResumableSession = yield* makeCurrentSessionResumable;
	const wakeCurrentSession = yield* makeCurrentSessionWake;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const announce = Effect.all(
		[feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()],
		{ concurrency: 1 },
	).pipe(Effect.asVoid);
	const resumable = (sessionId: string) =>
		provide(writer.write(reconcileResumableSession(sessionId))).pipe(
			Effect.tap(({ changed }) => (changed ? announce : Effect.void)),
			Effect.map(({ session }) => session),
		);
	const awaken = (sessionId: string) =>
		provide(writer.write(wakeCurrentSession(sessionId))).pipe(
			Effect.tap((woken) => (woken ? announce : Effect.void)),
			Effect.asVoid,
		);
	return { awaken, resumable };
});
