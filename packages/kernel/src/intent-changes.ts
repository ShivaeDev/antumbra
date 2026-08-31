import { Database } from "@antumbra/persistence";
import { Effect, Option, PubSub, Schema, Stream } from "effect";
import { IntentNotFound } from "#errors.ts";
import { IntentStatusSchema } from "#fsm.ts";
import { SchedulerState } from "#state.ts";

export const changesFor = (id: string) =>
	Stream.unwrap(
		Effect.gen(function* () {
			const db = yield* Database;
			const { pubsub } = yield* SchedulerState;
			// Subscribe before reading so a transition between the two is not lost.
			const subscription = yield* PubSub.subscribe(pubsub);
			const row = yield* db.Intent.where({ id }).first();
			if (Option.isNone(row)) {
				return yield* new IntentNotFound({ id });
			}
			const current = yield* Effect.orDie(Schema.decodeUnknownEffect(IntentStatusSchema)(row.value.status));
			const live = Stream.fromSubscription(subscription).pipe(
				Stream.filter((change) => change.id === id),
				Stream.map((change) => change.status),
			);
			return Stream.make(current).pipe(Stream.concat(live), Stream.changes);
		}),
	).pipe(Stream.scoped);
