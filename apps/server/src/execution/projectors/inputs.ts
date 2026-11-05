import { inputDeliveryChanged as project1Fact } from "@antumbra/domain-inputs/facts/delivery.ts";
import { inputObserved as project2Fact } from "@antumbra/domain-inputs/facts/observed.ts";
import { inputRecorded as project0Fact } from "@antumbra/domain-inputs/facts/recorded.ts";
import { inputRetried as project3Fact } from "@antumbra/domain-inputs/facts/retried.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Events as DomainEvents } from "@antumbra/server-inputs/events.ts";
import type { StampedEvent } from "@antumbra/server-storage/execution/definition.ts";
import { changed as project1Decision } from "@antumbra/server-storage/projections/inputs/delivery.ts";
import { observed as project2Decision } from "@antumbra/server-storage/projections/inputs/observed.ts";
import { recorded as project0Decision } from "@antumbra/server-storage/projections/inputs/recorded.ts";
import { retried as project3Decision } from "@antumbra/server-storage/projections/inputs/retried.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
export const apply = Effect.fn("ExecutionProjection.inputs")(function* (event: Event<StampedEvent>) {
	if (!Schema.is(DomainEvents)(event.value)) return;
	const value = event.value;
	switch (value._tag) {
		case "InputRecorded": {
			const payload = yield* Schema.decodeUnknownEffect(project0Fact.Payload)(value).pipe(Effect.orDie);
			yield* project0Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "InputDeliveryChanged": {
			const payload = yield* Schema.decodeUnknownEffect(project1Fact.Payload)(value).pipe(Effect.orDie);
			yield* project1Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "InputDeliveryObserved": {
			const payload = yield* Schema.decodeUnknownEffect(project2Fact.Payload)(value).pipe(Effect.orDie);
			yield* project2Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "InputRetried": {
			const payload = yield* Schema.decodeUnknownEffect(project3Fact.Payload)(value).pipe(Effect.orDie);
			yield* project3Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}

		default:
			return value satisfies never;
	}
});
