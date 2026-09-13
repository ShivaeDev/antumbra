import { request } from "@antumbra/domain-sessions/commands/request.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Clock, Effect } from "effect";
import { retire } from "#commands/retire.ts";
import { rest } from "#queries/rest.ts";

export const resting = reconciler("resting", {
	watch: rest,
	ports: [],
	due: (reading, now) => {
		const waits: number[] = [];
		for (const retirement of reading.retirements) {
			if (retirement.waitUntil !== null) waits.push(retirement.waitUntil);
		}
		for (const siesta of reading.siestas) {
			if (!siesta.held) waits.push(siesta.waitUntil);
		}
		let next: number | undefined;
		for (const at of waits) {
			if (at <= now) continue;
			if (next === undefined || at < next) next = at;
		}
		return next;
	},
	run: Effect.fn("Agents.resting")(function* (reading, reconciling) {
		const now = yield* Clock.currentTimeMillis;
		for (const held of reading.retirements) {
			if (held.waitUntil !== null && held.waitUntil > now) continue;
			yield* reconciling
				.commit(retire, { id: held.id, requestId: Request.make(`retire:${held.id}`) })
				.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unknown: () => Effect.void, Working: () => Effect.void }));
		}
		for (const held of reading.siestas) {
			if (held.held || held.waitUntil > now) continue;
			yield* reconciling
				.commit(request, {
					sessionId: SessionId.make(held.sessionId),
					requestId: Request.make(`siesta:${held.sessionId}:${held.idleSince}`),
					kind: "sleep",
					inputId: null,
					reason: "Idle siesta",
					requestedAt: new Date(now).toISOString(),
				})
				.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unavailable: () => Effect.void, Busy: () => Effect.void }));
		}
	}),
});
