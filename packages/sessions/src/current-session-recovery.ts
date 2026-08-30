import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect } from "effect";
import { makeCurrentSessionResumable } from "#current-session-resumable.ts";
import { makeCurrentSessionWake } from "#current-session-wake.ts";

export const makeCurrentSessionRecovery = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const reconcileResumableSession = yield* makeCurrentSessionResumable;
	const wakeCurrentSession = yield* makeCurrentSessionWake;
	const announce = Effect.all(
		[feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()],
		{ concurrency: 1 },
	).pipe(Effect.asVoid);
	const resumable = (sessionId: string) =>
		reconcileResumableSession(sessionId).pipe(
			Effect.tap(({ changed }) => (changed ? announce : Effect.void)),
			Effect.map(({ session }) => session),
		);
	const awaken = (sessionId: string) =>
		wakeCurrentSession(sessionId).pipe(
			Effect.tap((woken) => (woken ? announce : Effect.void)),
			Effect.asVoid,
		);
	return { awaken, resumable };
});
