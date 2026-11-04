import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
import type { ObservedFact } from "#observe.ts";
import type { StampedEvent } from "#postgres/execution/definition.ts";
import type { State } from "#postgres/execution/state.ts";

export const observationEvent = (state: State) =>
	Effect.fn("ExecutionHistory.observationEvent")(function* (
		fact: ObservedFact,
		history: readonly Event<StampedEvent>[],
		at: number,
		sequence: number,
	) {
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
