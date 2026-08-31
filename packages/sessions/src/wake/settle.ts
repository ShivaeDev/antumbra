import { type IntentKind, Kernel } from "@antumbra/kernel";
import { Effect } from "effect";
import type { WakeFields } from "#wake/wake.ts";

// A parked wake for a closed Session must run to its own refusal so its row records why delivery became impossible.
export const makeSettleWakes = (wake: IntentKind<WakeFields>) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const push = (id: string) =>
			kernel.retry(id).pipe(
				Effect.catchTags({
					IntentNotFound: () => Effect.void,
					InvalidTransition: () => Effect.void,
				}),
			);
		return (sessionId: string): Effect.Effect<void> =>
			Effect.gen(function* () {
				const active = yield* kernel.active(wake);
				const parked = active.filter((intent) => intent.payload.sessionId === sessionId && intent.status === "waiting");
				yield* Effect.forEach(parked, (intent) => push(intent.id), {
					concurrency: 1,
					discard: true,
				});
			}).pipe(Effect.catchCause((cause) => Effect.logWarning("a parked wake could not be settled", { sessionId }, cause)));
	});
