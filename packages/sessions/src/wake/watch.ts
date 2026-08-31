import { type IntentStatus, isTerminalIntentStatus } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Effect, Fiber, Option, Stream } from "effect";
import type { SessionRouse } from "#reach.ts";

// A waiting wake requires another explicit act, so it ends this send-scoped watcher.
const isWakeSettled = (status: IntentStatus) => status === "waiting" || isTerminalIntentStatus(status);

// Warn before the wake's own timeout; a fixed longer delay would never fire.
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

// This watcher reports only lack of progress; the Intent path accounts outcomes so boot requeues are covered.
export const watchWake = (sessionId: string, rouse: SessionRouse, patienceMillis: number) =>
	Effect.gen(function* () {
		const stalled = yield* Effect.forkChild(
			Effect.sleep(stallOf(patienceMillis)).pipe(Effect.andThen(account(sessionId, rouse.id, "a wake has not settled"))),
		);
		yield* rouse.changes.pipe(Stream.takeUntil(isWakeSettled), Stream.runLast);
		yield* Fiber.interrupt(stalled);
	}).pipe(Effect.catchCause((cause) => Effect.logWarning("a wake could not be watched", { intentId: rouse.id, sessionId }, cause)));
