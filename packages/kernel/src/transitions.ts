import { Database, type PrismaError } from "@antumbra/persistence";
import { Clock, type Context, Effect, Option, PubSub, Queue, Ref, Schema } from "effect";
import { IntentNotFound } from "#errors.ts";
import { type IntentEvent, IntentStatusSchema, type InvalidTransition, transition } from "#fsm.ts";
import type { IntentChange } from "#kernel.ts";
import { SchedulerState } from "#state.ts";

export const transitionRow = (
	id: string,
	event: IntentEvent,
	detail?: string,
): Effect.Effect<IntentChange, IntentNotFound | InvalidTransition | PrismaError, Context.Service.Identifier<typeof Database>> =>
	Effect.gen(function* () {
		const db = yield* Database;
		const row = yield* db.Intent.where({ id }).first();
		if (Option.isNone(row)) {
			return yield* new IntentNotFound({ id });
		}
		const current = yield* Effect.orDie(Schema.decodeUnknownEffect(IntentStatusSchema)(row.value.status));
		const status = yield* Effect.fromResult(transition(current, event));
		const now = yield* Clock.currentTimeMillis;
		const written = { status, updatedAt: new Date(now) };
		yield* db.Intent.where({ id }).update(detail === undefined ? written : { ...written, detail });
		return { id, status };
	});

export const announce = (change: IntentChange) =>
	Effect.gen(function* () {
		const state = yield* SchedulerState;
		yield* Ref.set(state.lastChangeAt, yield* Clock.currentTimeMillis);
		yield* PubSub.publish(state.pubsub, change);
		yield* Queue.offer(state.tick, undefined);
	});

export const applyTransition = (id: string, event: IntentEvent, detail?: string) =>
	Effect.gen(function* () {
		const change = yield* transitionRow(id, event, detail);
		yield* announce(change);
		return change;
	});
