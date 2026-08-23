import { type IntentKind, Kernel } from "@antumbra/kernel";
import type { WriteExecutors } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RecoveryFields } from "#session-recovery.ts";

// why: a wake parked against a Session that has since closed is a demand no act
// can ever complete. The send that would push it refuses on the closed Session
// first, and boot reclaim only requeues what was running — so the row waits for
// ever with the admiral's words sealed inside it, and the fleet shows a pending
// demand that is nothing of the kind.
//
// why: pushing the row is how it reaches its own verdict rather than being
// cancelled from outside. A cancel carries no sentence, so the row would settle
// still wearing whatever reason it parked with; a push makes the recover run,
// find the closed Session, and refuse with the reason written on it.
export const makeSettleWakes = (recover: IntentKind<RecoveryFields>) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const executors = yield* Effect.context<WriteExecutors>();
		const push = (id: string) =>
			kernel.retry(id).pipe(
				Effect.catchTags({
					IntentNotFound: () => Effect.void,
					InvalidTransition: () => Effect.void,
				}),
			);
		return (sessionId: string): Effect.Effect<void> =>
			Effect.gen(function* () {
				const active = yield* kernel.active(recover);
				const parked = active.filter(
					(intent) =>
						intent.payload.sessionId === sessionId &&
						intent.status === "waiting",
				);
				yield* Effect.forEach(parked, (intent) => push(intent.id), {
					concurrency: 1,
					discard: true,
				});
			}).pipe(
				Effect.provideContext(executors),
				// why: settling is housekeeping alongside an answer the caller is
				// already giving, so it says what went wrong and lets that answer
				// through rather than replacing it with a second failure.
				Effect.catchCause((cause) =>
					Effect.logWarning(
						"a parked wake could not be settled",
						{ sessionId },
						cause,
					),
				),
			);
	});
