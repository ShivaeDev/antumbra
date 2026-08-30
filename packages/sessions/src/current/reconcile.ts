import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect, Result } from "effect";
import { planCurrentSessionReconciliation } from "#current/reconcile-plan.ts";
import { makeCurrentSessionRepair } from "#current/repair.ts";
import { rootSessions } from "#roots.ts";

export const makeCurrentSessionReconciler = Effect.gen(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const feeds = yield* DomainFeeds;
	const applyRepair = yield* makeCurrentSessionRepair;
	const reconcile = Effect.gen(function* () {
		const planned = planCurrentSessionReconciliation(
			yield* db.Agent.all(),
			yield* db.AgentSession.where(rootSessions).all(),
			yield* fabric.attached(),
		);
		if (Result.isFailure(planned)) {
			return planned.failure._tag === "CurrentSessionInvalid" ? yield* planned.failure : false;
		}
		return (yield* applyRepair(null, planned.success)).changed;
	});
	return reconcile.pipe(
		Effect.tap((changed) =>
			changed ? Effect.all([feeds.publishFleetRefresh(), feeds.publishVoyageRefresh()], { concurrency: 1 }).pipe(Effect.asVoid) : Effect.void,
		),
		Effect.asVoid,
	);
});
