import { Effect, type Scope } from "effect";
import { SessionReach } from "#reach.ts";
import { SessionSendOptions } from "#send/options.ts";
import type { WakeFields } from "#wake/input.ts";
import { watchWake } from "#wake/watch.ts";

export const rouseSession = (scope: Scope.Scope) =>
	Effect.fn("SessionSend.rouseSession")(function* (payload: WakeFields) {
		const reach = yield* SessionReach;
		const { wakePatienceMillis } = yield* SessionSendOptions;
		const wake = yield* reach.rouseSession(payload);
		yield* Effect.forkIn(watchWake(payload.sessionId, wake, wakePatienceMillis), scope);
	});
