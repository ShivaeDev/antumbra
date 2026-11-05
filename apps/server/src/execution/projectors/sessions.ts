import { toolAnswered as project3Fact } from "@antumbra/domain-sessions/commands/answer-tool.ts";
import { toolCalled as project1Fact } from "@antumbra/domain-sessions/commands/call-tool.ts";
import { sessionChartered as project7Fact } from "@antumbra/domain-sessions/commands/charter.ts";
import { operationHeld as project6Fact } from "@antumbra/domain-sessions/commands/hold.ts";
import { operationRetried as project2Fact } from "@antumbra/domain-sessions/commands/retry.ts";
import { sessionStopped as project8Fact } from "@antumbra/domain-sessions/commands/stop.ts";
import { observed as project4Fact } from "@antumbra/domain-sessions/facts/observed.ts";
import { operationRequested as project5Fact } from "@antumbra/domain-sessions/facts/operation-requested.ts";
import { providerEvent as project0Fact } from "@antumbra/domain-sessions/facts/provider-event.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Events as DomainEvents } from "@antumbra/server-sessions/events.ts";
import type { StampedEvent } from "@antumbra/server-storage/execution/definition.ts";
import { toolAnsweredMaterializer as project3Decision } from "@antumbra/server-storage/projections/sessions/commands/answer-tool.ts";
import { toolCalledMaterializer as project1Decision } from "@antumbra/server-storage/projections/sessions/commands/call-tool.ts";
import { sessionCharteredMaterializer as project7Decision } from "@antumbra/server-storage/projections/sessions/commands/charter.ts";
import { operationHeldMaterializer as project6Decision } from "@antumbra/server-storage/projections/sessions/commands/hold.ts";
import { operationRetriedMaterializer as project2Decision } from "@antumbra/server-storage/projections/sessions/commands/retry.ts";
import { sessionStoppedMaterializer as project8Decision } from "@antumbra/server-storage/projections/sessions/commands/stop.ts";
import { observedMaterializer as project4Decision } from "@antumbra/server-storage/projections/sessions/observed.ts";
import { operationRequestedMaterializer as project5Decision } from "@antumbra/server-storage/projections/sessions/operation-requested.ts";
import { providerEventMaterializer as project0Decision } from "@antumbra/server-storage/projections/sessions/provider-event.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
export const apply = Effect.fn("ExecutionProjection.sessions")(function* (event: Event<StampedEvent>) {
	if (!Schema.is(DomainEvents)(event.value)) return;
	const value = event.value;
	switch (value._tag) {
		case "SessionProviderEvent": {
			const payload = yield* Schema.decodeUnknownEffect(project0Fact.Payload)(value).pipe(Effect.orDie);
			yield* project0Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "SessionToolCalled": {
			const payload = yield* Schema.decodeUnknownEffect(project1Fact.Payload)(value).pipe(Effect.orDie);
			yield* project1Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "SessionOperationRetried": {
			const payload = yield* Schema.decodeUnknownEffect(project2Fact.Payload)(value).pipe(Effect.orDie);
			yield* project2Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "SessionToolAnswered": {
			const payload = yield* Schema.decodeUnknownEffect(project3Fact.Payload)(value).pipe(Effect.orDie);
			yield* project3Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "SessionObserved": {
			const payload = yield* Schema.decodeUnknownEffect(project4Fact.Payload)(value).pipe(Effect.orDie);
			yield* project4Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "SessionOperationRequested": {
			const payload = yield* Schema.decodeUnknownEffect(project5Fact.Payload)(value).pipe(Effect.orDie);
			yield* project5Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "SessionOperationHeld": {
			const payload = yield* Schema.decodeUnknownEffect(project6Fact.Payload)(value).pipe(Effect.orDie);
			yield* project6Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "SessionChartered": {
			const payload = yield* Schema.decodeUnknownEffect(project7Fact.Payload)(value).pipe(Effect.orDie);
			yield* project7Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "SessionStopped": {
			const payload = yield* Schema.decodeUnknownEffect(project8Fact.Payload)(value).pipe(Effect.orDie);
			yield* project8Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}

		default:
			return value satisfies never;
	}
});
