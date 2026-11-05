import { rest } from "@antumbra/domain-agents/queries/rest.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Clock, Effect } from "effect";
import { watchKeys } from "#supervision/keys.ts";

export const resting = Effect.fn("Agents.resting")(function* () {
	const agentsService = yield* Agents;

	return yield* run({
		keys: watchKeys(rest.reads, undefined),
		read: agentsService.rest({}).pipe(Effect.orDie),
		due: (reading, now) => {
			const times = [
				...reading.retirements.flatMap((held) => (held.waitUntil === null ? [] : [held.waitUntil])),
				...reading.siestas.filter((held) => !held.held).map((held) => held.waitUntil),
			].filter((at) => at > now);
			return times.length === 0 ? undefined : Math.min(...times);
		},
		act: Effect.fn("Agents.resting")(function* (reading) {
			const agentsService = yield* Agents;
			const sessionsService = yield* Sessions;

			const now = yield* Clock.currentTimeMillis;
			for (const held of reading.retirements) {
				if (held.waitUntil !== null && held.waitUntil > now) continue;
				yield* agentsService
					.retire({ id: held.id, requestId: Request.make(`retire:${held.id}`) })
					.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unknown: () => Effect.void, Working: () => Effect.void }));
			}
			for (const held of reading.siestas) {
				if (held.held || held.waitUntil > now) continue;
				yield* sessionsService
					.request({
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
});
