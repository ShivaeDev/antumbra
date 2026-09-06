import type { HoldsView } from "@antumbra/contract";
import { Clock, Effect } from "effect";
import { ExecutionSource } from "#execution/service.ts";
import { dispatchWaiting } from "#hold-waits/dispatch.ts";
import { wakeWaiting } from "#hold-waits/wake.ts";
import { MailDelivery } from "#mail-delivery/service.ts";

export const read = Effect.fn("HoldWaits.read")(function* () {
	const mail = yield* MailDelivery;
	const execution = yield* ExecutionSource;

	const nowMillis = yield* Clock.currentTimeMillis;
	const world = yield* execution.dispatch();
	const wakes = yield* wakeWaiting(yield* mail.dueWakes());
	return {
		queues: [
			{ kind: "dispatch", waiting: dispatchWaiting(world, nowMillis) },
			{ kind: "wake", waiting: wakes },
		],
	} satisfies HoldsView;
});
