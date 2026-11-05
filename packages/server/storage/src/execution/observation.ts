import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
import type { StampedEvent } from "#execution/definition.ts";
import { ExecutionStore } from "#execution/state.ts";
import type { ObservedFact } from "#observe.ts";

export const observationEvent = Effect.fn("ExecutionHistory.observationEvent")(function* (
	fact: ObservedFact,
	history: readonly Event<StampedEvent>[],
	at: number,
	sequence: number,
) {
	const state = yield* ExecutionStore;
	const encoded = yield* Schema.encodeUnknownEffect(fact.fact.Payload)(fact.payload);
	const value = yield* Schema.decodeUnknownEffect(state.schema)(Object.assign({}, encoded, { _tag: fact.fact.name, at, sequence }));
	const subject = fact.fact.subject;
	if (subject !== undefined) {
		const previous = history.findLast((event) => event.value._tag === value._tag && event.value[subject] === value[subject]);
		if (previous !== undefined && JSON.stringify(yield* Schema.encodeUnknownEffect(fact.fact.Payload)(previous.value)) === JSON.stringify(encoded))
			return undefined;
	}
	return value;
});
