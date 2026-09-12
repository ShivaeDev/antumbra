import { request } from "@antumbra/domain-sessions/commands/request.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Clock, Effect } from "effect";
import { retire } from "#commands/retire.ts";
import { dueRetirements } from "#queries/due-retirements.ts";
import { dueSiestas } from "#queries/due-siestas.ts";
import { roster } from "#queries/roster.ts";

export const resting = reconciler("resting", {
	watch: roster,
	ports: [],
	run: Effect.fn("Agents.resting")(function* (_reading, reconciling) {
		const now = yield* Clock.currentTimeMillis;
		for (const held of yield* reconciling.read(dueRetirements, { now })) {
			yield* reconciling
				.commit(retire, { id: held.id, requestId: Request.make(`retire:${held.id}`) })
				.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unknown: () => Effect.void, Working: () => Effect.void }));
		}
		for (const held of yield* reconciling.read(dueSiestas, { now })) {
			if (held.currentSessionId === null) continue;
			yield* reconciling
				.commit(request, {
					sessionId: SessionId.make(held.currentSessionId),
					requestId: Request.make(`siesta:${held.currentSessionId}:${held.idleSince}`),
					kind: "sleep",
					inputId: null,
					reason: "Idle siesta",
					requestedAt: new Date(now).toISOString(),
				})
				.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unavailable: () => Effect.void, Busy: () => Effect.void }));
		}
	}),
});
