import { agentRetired as project1Fact } from "@antumbra/domain-agents/facts/agent-retired.ts";
import { birthAdmitted as project4Fact } from "@antumbra/domain-agents/facts/birth-admitted.ts";
import { birthCancelled as project7Fact } from "@antumbra/domain-agents/facts/birth-cancelled.ts";
import { birthDelayed as project6Fact } from "@antumbra/domain-agents/facts/birth-delayed.ts";
import { birthHeld as project5Fact } from "@antumbra/domain-agents/facts/birth-held.ts";
import { birthRequested as project3Fact } from "@antumbra/domain-agents/facts/birth-requested.ts";
import { birthRetried as project8Fact } from "@antumbra/domain-agents/facts/birth-retried.ts";
import { crewRetired as project0Fact } from "@antumbra/domain-agents/facts/crew-retired.ts";
import { smoothingRequested as project2Fact } from "@antumbra/domain-agents/facts/smoothing-requested.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Events as DomainEvents } from "@antumbra/server-agents/events.ts";
import type { StampedEvent } from "@antumbra/server-storage/execution/definition.ts";
import { agentRetiredMaterializer as project1Decision } from "@antumbra/server-storage/projections/agents/agent-retired.ts";
import { birthAdmittedMaterializer as project4Decision } from "@antumbra/server-storage/projections/agents/birth-admitted.ts";
import { birthCancelledMaterializer as project7Decision } from "@antumbra/server-storage/projections/agents/birth-cancelled.ts";
import { birthDelayedMaterializer as project6Decision } from "@antumbra/server-storage/projections/agents/birth-delayed.ts";
import { birthHeldMaterializer as project5Decision } from "@antumbra/server-storage/projections/agents/birth-held.ts";
import { birthRequestedMaterializer as project3Decision } from "@antumbra/server-storage/projections/agents/birth-requested.ts";
import { birthRetriedMaterializer as project8Decision } from "@antumbra/server-storage/projections/agents/birth-retried.ts";
import { crewRetiredMaterializer as project0Decision } from "@antumbra/server-storage/projections/agents/crew-retired.ts";
import { smoothingRequestedMaterializer as project2Decision } from "@antumbra/server-storage/projections/agents/smoothing-requested.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
export const apply = Effect.fn("ExecutionProjection.agents")(function* (event: Event<StampedEvent>) {
	if (!Schema.is(DomainEvents)(event.value)) return;
	const value = event.value;
	switch (value._tag) {
		case "CrewRetired": {
			const payload = yield* Schema.decodeUnknownEffect(project0Fact.Payload)(value).pipe(Effect.orDie);
			yield* project0Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "AgentRetired": {
			const payload = yield* Schema.decodeUnknownEffect(project1Fact.Payload)(value).pipe(Effect.orDie);
			yield* project1Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "SmoothingRequested": {
			const payload = yield* Schema.decodeUnknownEffect(project2Fact.Payload)(value).pipe(Effect.orDie);
			yield* project2Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "BirthRequested": {
			const payload = yield* Schema.decodeUnknownEffect(project3Fact.Payload)(value).pipe(Effect.orDie);
			yield* project3Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "BirthAdmitted": {
			const payload = yield* Schema.decodeUnknownEffect(project4Fact.Payload)(value).pipe(Effect.orDie);
			yield* project4Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "BirthHeld": {
			const payload = yield* Schema.decodeUnknownEffect(project5Fact.Payload)(value).pipe(Effect.orDie);
			yield* project5Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "BirthDelayed": {
			const payload = yield* Schema.decodeUnknownEffect(project6Fact.Payload)(value).pipe(Effect.orDie);
			yield* project6Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "BirthCancelled": {
			const payload = yield* Schema.decodeUnknownEffect(project7Fact.Payload)(value).pipe(Effect.orDie);
			yield* project7Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "BirthRetried": {
			const payload = yield* Schema.decodeUnknownEffect(project8Fact.Payload)(value).pipe(Effect.orDie);
			yield* project8Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}

		default:
			return value satisfies never;
	}
});
