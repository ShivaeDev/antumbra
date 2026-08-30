import { type IntentStatus, isTerminalIntentStatus } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Effect, Fiber, Option, Stream } from "effect";
import type { SessionRouse } from "#reach.ts";

// why: a wake that parked is as finished as one that failed, from the send's
// point of view — nothing is coming without another act — so waiting settles
// the watch alongside the terminal three.
const isWakeSettled = (status: IntentStatus) => status === "waiting" || isTerminalIntentStatus(status);

// why: the stall warning is only news while the wake can still be saved, so the
// threshold is a fraction of the patience the wake is measured against rather
// than a constant standing beside it. Set above the patience — as a flat ninety
// seconds was against a bound of sixty — the wake is dead and settled before
// the warning is ever due, and the one report that says "nothing at all is
// happening" could not fire on this path at all.
const stallOf = (patienceMillis: number) => Math.max(1, Math.floor(patienceMillis / 2));

const GONE = {
	detail: "the Intent row is gone",
	status: "missing",
	tag: "missing",
} as const;

const account = (sessionId: string, intentId: string, said: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* db.Intent.where({ id: intentId }).first();
		const intent = Option.match(row, {
			onNone: () => GONE,
			onSome: (stored) => ({
				detail: stored.detail ?? "the Intent recorded no reason",
				status: stored.status,
				tag: stored.tag,
			}),
		});
		yield* Effect.logWarning(said, {
			detail: intent.detail,
			intentId,
			sessionId,
			status: intent.status,
			tag: intent.tag,
		});
	});

// why: what the send can say about its own wake that the wake cannot say about
// itself — that nothing has happened yet. Why it ended is accounted for on the
// Intent's own path, because a wake requeued by boot reclaim has no send
// standing over it and would otherwise end in silence.
export const watchWake = (sessionId: string, rouse: SessionRouse, patienceMillis: number) =>
	Effect.gen(function* () {
		const stalled = yield* Effect.forkChild(
			Effect.sleep(stallOf(patienceMillis)).pipe(Effect.andThen(account(sessionId, rouse.id, "a wake has not settled"))),
		);
		yield* rouse.changes.pipe(Stream.takeUntil(isWakeSettled), Stream.runLast);
		yield* Fiber.interrupt(stalled);
	}).pipe(Effect.catchCause((cause) => Effect.logWarning("a wake could not be watched", { intentId: rouse.id, sessionId }, cause)));
