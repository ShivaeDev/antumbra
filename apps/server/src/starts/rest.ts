import { retire } from "@antumbra/domain-agents/commands/retire.ts";
import { dueRetirements } from "@antumbra/domain-agents/queries/due-retirements.ts";
import { dueSiestas } from "@antumbra/domain-agents/queries/due-siestas.ts";
import { roster } from "@antumbra/domain-agents/queries/roster.ts";
import { request } from "@antumbra/domain-sessions/commands/request.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { run } from "@antumbra/server-journal/reconcile.ts";
import { Clock, Effect } from "effect";

export const restPass = Effect.fn("Starts.restPass")(function* () {
	const live = yield* Live;
	const commit = yield* Commit;
	const now = yield* Clock.currentTimeMillis;
	for (const agent of yield* live.read(dueRetirements, { now })) {
		yield* commit
			.commit(retire, { id: agent.id, requestId: Request.make(`retire:${agent.id}`) })
			.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unknown: () => Effect.void, Working: () => Effect.void }));
	}
	for (const agent of yield* live.read(dueSiestas, { now })) {
		if (agent.currentSessionId === null) continue;
		yield* commit
			.commit(request, {
				sessionId: SessionId.make(agent.currentSessionId),
				requestId: Request.make(`siesta:${agent.currentSessionId}:${agent.idleSince}`),
				kind: "sleep",
				inputId: null,
				reason: "Idle siesta",
				requestedAt: new Date(now).toISOString(),
			})
			.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unavailable: () => Effect.void, Busy: () => Effect.void }));
	}
});

export const resting = Effect.gen(function* () {
	const reconciler = yield* run(roster, {}, () => restPass());
	yield* Effect.forkScoped(Effect.forever(Effect.andThen(Effect.sleep(5000), reconciler.refresh)));
	return reconciler;
});
