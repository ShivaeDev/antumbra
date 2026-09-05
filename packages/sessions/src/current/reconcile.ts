import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect, Result } from "effect";
import { announce } from "#current/announce.ts";
import { planCurrentSessionReconciliation } from "#current/reconcile-plan.ts";
import { applyRepair } from "#current/repair.ts";
import { rootSessions } from "#roots.ts";

export const reconcile = Effect.fn("CurrentSessions.reconcile")(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const planned = planCurrentSessionReconciliation(yield* db.Agent.all(), yield* db.AgentSession.where(rootSessions).all(), yield* fabric.attached());
	if (Result.isFailure(planned)) {
		if (planned.failure._tag === "CurrentSessionInvalid") {
			return yield* planned.failure;
		}
		return;
	}
	const repaired = yield* applyRepair(null, planned.success);
	if (repaired.changed) {
		yield* announce();
	}
});
