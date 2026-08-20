import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Effect, PubSub, Result } from "effect";
import { planCurrentSessionReconciliation } from "#current-session-reconcile-plan.ts";
import { rootSessions } from "#session-roots.ts";

export const makeCurrentSessionReconciler = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const reconcile = provide(
		writer.write(
			Effect.gen(function* () {
				const planned = planCurrentSessionReconciliation(
					yield* db.Agent.all(),
					yield* db.AgentSession.where(rootSessions).all(),
				);
				if (Result.isFailure(planned)) {
					return planned.failure._tag === "CurrentSessionInvalid"
						? yield* planned.failure
						: false;
				}
				yield* Effect.forEach(
					planned.success.pointers,
					(pointer) =>
						db.Agent.where({ id: pointer.agentId }).update({
							currentSessionId: pointer.currentSessionId,
						}),
					{ discard: true },
				);
				yield* Effect.forEach(
					planned.success.sessionsToClose,
					(sessionId) =>
						db.AgentSession.where({ id: sessionId }).update({
							status: "closed",
						}),
					{ discard: true },
				);
				return (
					planned.success.pointers.length > 0 ||
					planned.success.sessionsToClose.length > 0
				);
			}),
		),
	);
	return reconcile.pipe(
		Effect.tap((changed) =>
			changed
				? Effect.all(
						[
							PubSub.publish(feeds.fleet, undefined),
							PubSub.publish(feeds.voyages, undefined),
						],
						{ concurrency: 1 },
					).pipe(Effect.asVoid)
				: Effect.void,
		),
		Effect.asVoid,
	);
});
