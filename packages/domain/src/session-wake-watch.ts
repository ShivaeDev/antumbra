import type { IntentStatus } from "@antumbra/kernel";
import { Effect, Fiber, Option, Stream } from "effect";
import { accountOfIntent } from "#dispatch-failure-account.ts";
import type { SessionRouse } from "#kernel-reach.ts";

// why: a wake that parked is as finished as one that failed, from the send's
// point of view — nothing is coming without another act — so waiting settles
// the watch alongside the terminal three.
const SETTLED: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
	"waiting",
]);

// why: generous, because a real resume opens a provider session and reads back
// what happened while nothing was listening. It is a floor under legibility and
// never a deadline on the work: passing it says the wake has not settled, and
// the watch keeps running in case it still does.
const STALL_MILLIS = 90_000;

const account = (sessionId: string, intentId: string, said: string) =>
	Effect.gen(function* () {
		const intent = yield* accountOfIntent(intentId);
		yield* Effect.logWarning(said, {
			detail: intent.detail,
			intentId,
			sessionId,
			status: intent.status,
			tag: intent.tag,
		});
	});

// why: the whole of what the admiral's send knows about its own wake. The
// mutation that asked for it returns the moment the Intent is on the record,
// so without this the send has no reader at all: a wake that parked, failed,
// was cancelled, or simply never moved would leave nothing behind but a row
// somebody would have to go and look for.
export const watchWake = (sessionId: string, rouse: SessionRouse) =>
	Effect.gen(function* () {
		const stalled = yield* Effect.forkChild(
			Effect.sleep(STALL_MILLIS).pipe(
				Effect.andThen(account(sessionId, rouse.id, "a wake has not settled")),
			),
		);
		const status = yield* rouse.changes.pipe(
			Stream.takeUntil((state) => SETTLED.has(state)),
			Stream.runLast,
		);
		yield* Fiber.interrupt(stalled);
		if (Option.isSome(status) && status.value !== "succeeded") {
			yield* account(sessionId, rouse.id, "a wake did not reach the session");
		}
	}).pipe(
		Effect.catchCause((cause) =>
			Effect.logWarning(
				"a wake could not be watched",
				{ intentId: rouse.id, sessionId },
				cause,
			),
		),
	);
