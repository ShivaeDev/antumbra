import { loopFailed as project0Fact } from "@antumbra/domain-supervision/commands/loop-failed.ts";
import { loopForgotten as project1Fact } from "@antumbra/domain-supervision/commands/loop-forgotten.ts";
import { loopResumed as project2Fact } from "@antumbra/domain-supervision/commands/loop-resumed.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { StampedEvent } from "@antumbra/server-storage/execution/definition.ts";
import { loopFailedMaterializer as project0Decision } from "@antumbra/server-storage/projections/supervision/commands/loop-failed.ts";
import { loopForgottenMaterializer as project1Decision } from "@antumbra/server-storage/projections/supervision/commands/loop-forgotten.ts";
import { loopResumedMaterializer as project2Decision } from "@antumbra/server-storage/projections/supervision/commands/loop-resumed.ts";
import { Events as DomainEvents } from "@antumbra/server-supervision/events.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
export const apply = Effect.fn("ExecutionProjection.supervision")(function* (event: Event<StampedEvent>) {
	if (!Schema.is(DomainEvents)(event.value)) return;
	const value = event.value;
	switch (value._tag) {
		case "LoopFailed": {
			const payload = yield* Schema.decodeUnknownEffect(project0Fact.Payload)(value).pipe(Effect.orDie);
			yield* project0Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "LoopForgotten": {
			const payload = yield* Schema.decodeUnknownEffect(project1Fact.Payload)(value).pipe(Effect.orDie);
			yield* project1Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "LoopResumed": {
			const payload = yield* Schema.decodeUnknownEffect(project2Fact.Payload)(value).pipe(Effect.orDie);
			yield* project2Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}

		default:
			return value satisfies never;
	}
});
