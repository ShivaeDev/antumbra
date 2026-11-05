import { capacityObserved as project0Fact } from "@antumbra/domain-capacity/facts/observed.ts";
import { capacityReleased as project1Fact } from "@antumbra/domain-capacity/facts/released.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Events as DomainEvents } from "@antumbra/server-capacity/events.ts";
import type { StampedEvent } from "@antumbra/server-storage/execution/definition.ts";
import { observed as project0Decision } from "@antumbra/server-storage/projections/capacity/observed.ts";
import { released as project1Decision } from "@antumbra/server-storage/projections/capacity/released.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
export const apply = Effect.fn("ExecutionProjection.capacity")(function* (event: Event<StampedEvent>) {
	if (!Schema.is(DomainEvents)(event.value)) return;
	const value = event.value;
	switch (value._tag) {
		case "CapacityObserved": {
			const payload = yield* Schema.decodeUnknownEffect(project0Fact.Payload)(value).pipe(Effect.orDie);
			yield* project0Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "CapacityReleased": {
			const payload = yield* Schema.decodeUnknownEffect(project1Fact.Payload)(value).pipe(Effect.orDie);
			yield* project1Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}

		default:
			return value satisfies never;
	}
});
