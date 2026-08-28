import { Database, type PrismaError } from "@antumbra/persistence";
import {
	Clock,
	type Context,
	Effect,
	Option,
	PubSub,
	Queue,
	Ref,
	Schema,
} from "effect";
import { IntentNotFound } from "#errors.ts";
import {
	type IntentEvent,
	IntentStatusSchema,
	type InvalidTransition,
	transition,
} from "#fsm.ts";
import type { IntentChange } from "#kernel.ts";
import { SchedulerState } from "#state.ts";

const transientConnection = (failure: PrismaError): boolean =>
	failure.reason._tag === "PrismaConnectionFailure" &&
	failure.reason.transient === true;

// why: every status write is a guarded read-transition-update against the FSM
// table. A competing winner makes this act re-read and re-apply the event to
// the new truth, so an illegal move can never reach the row.
export const transitionRow = (
	id: string,
	event: IntentEvent,
	detail?: string,
): Effect.Effect<
	IntentChange,
	IntentNotFound | InvalidTransition | PrismaError,
	Context.Service.Identifier<typeof Database>
> =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* db.Intent.where({ id }).first();
		if (Option.isNone(row)) {
			return yield* new IntentNotFound({ id });
		}
		const current = yield* Effect.orDie(
			Schema.decodeUnknownEffect(IntentStatusSchema)(row.value.status),
		);
		const status = yield* Effect.fromResult(transition(current, event));
		const now = yield* Clock.currentTimeMillis;
		// why: detail is the last thing the intent had to say — the reason it
		// waited, the cause it failed on, the note reclaim left. A move that
		// carries none has nothing to add, so it leaves that record standing;
		// writing null on every move is how a failure reason went missing
		// between the write and whoever came to read it.
		const written = { status, updatedAt: new Date(now) };
		const updated = yield* db.Intent.where({
			id,
			status: row.value.status,
		})
			.update(detail === undefined ? written : { ...written, detail })
			.pipe(
				Effect.catchTag("PrismaError", (failure) =>
					transientConnection(failure)
						? Effect.yieldNow.pipe(Effect.as(null))
						: Effect.fail(failure),
				),
			);
		if (updated === null) {
			return yield* transitionRow(id, event, detail);
		}
		return { id, status };
	});

export const announce = (change: IntentChange) =>
	Effect.gen(function* () {
		const state = yield* SchedulerState;
		yield* Ref.set(state.lastChangeAt, yield* Clock.currentTimeMillis);
		yield* PubSub.publish(state.pubsub, change);
		yield* Queue.offer(state.tick, undefined);
	});

export const applyTransition = (
	id: string,
	event: IntentEvent,
	detail?: string,
) =>
	Effect.gen(function* () {
		const change = yield* transitionRow(id, event, detail);
		yield* announce(change);
		return change;
	});
