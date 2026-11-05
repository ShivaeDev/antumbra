import { restartCleared as project1Fact } from "@antumbra/domain-lifecycle/facts/restart-cleared.ts";
import { restartRecorded as project0Fact } from "@antumbra/domain-lifecycle/facts/restart-recorded.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Events as DomainEvents } from "@antumbra/server-lifecycle/events.ts";
import type { StampedEvent } from "@antumbra/server-storage/execution/definition.ts";
import { restartClearedMaterializer as project1Decision } from "@antumbra/server-storage/projections/lifecycle/restart-cleared.ts";
import { restartRecordedMaterializer as project0Decision } from "@antumbra/server-storage/projections/lifecycle/restart-recorded.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
export const apply = Effect.fn("ExecutionProjection.lifecycle")(function* (event: Event<StampedEvent>) {
	if (!Schema.is(DomainEvents)(event.value)) return;
	const value = event.value;
	switch (value._tag) {
		case "RestartRecorded": {
			const payload = yield* Schema.decodeUnknownEffect(project0Fact.Payload)(value).pipe(Effect.orDie);
			yield* project0Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RestartCleared": {
			const payload = yield* Schema.decodeUnknownEffect(project1Fact.Payload)(value).pipe(Effect.orDie);
			yield* project1Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}

		default:
			return value satisfies never;
	}
});
