import { rulingAnswered as project1Fact } from "@antumbra/domain-rulings/facts/ruling-answered.ts";
import { rulingContextAdded as project2Fact } from "@antumbra/domain-rulings/facts/ruling-context-added.ts";
import { rulingDelivered as project3Fact } from "@antumbra/domain-rulings/facts/ruling-delivered.ts";
import { rulingGated as project4Fact } from "@antumbra/domain-rulings/facts/ruling-gated.ts";
import { rulingNoticeDelivered as project0Fact } from "@antumbra/domain-rulings/facts/ruling-notice-delivered.ts";
import { rulingParked as project5Fact } from "@antumbra/domain-rulings/facts/ruling-parked.ts";
import { rulingPassedUp as project6Fact } from "@antumbra/domain-rulings/facts/ruling-passed-up.ts";
import { rulingProclaimed as project7Fact } from "@antumbra/domain-rulings/facts/ruling-proclaimed.ts";
import { rulingReclassified as project8Fact } from "@antumbra/domain-rulings/facts/ruling-reclassified.ts";
import { rulingRequested as project9Fact } from "@antumbra/domain-rulings/facts/ruling-requested.ts";
import { rulingSuperseded as project10Fact } from "@antumbra/domain-rulings/facts/ruling-superseded.ts";
import { rulingWithdrawn as project11Fact } from "@antumbra/domain-rulings/facts/ruling-withdrawn.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Events as DomainEvents } from "@antumbra/server-rulings/events.ts";
import type { StampedEvent } from "@antumbra/server-storage/execution/definition.ts";
import { rulingAnsweredMaterializer as project1Decision } from "@antumbra/server-storage/projections/rulings/ruling-answered.ts";
import { rulingContextAddedMaterializer as project2Decision } from "@antumbra/server-storage/projections/rulings/ruling-context-added.ts";
import { rulingDeliveredMaterializer as project3Decision } from "@antumbra/server-storage/projections/rulings/ruling-delivered.ts";
import { rulingGatedMaterializer as project4Decision } from "@antumbra/server-storage/projections/rulings/ruling-gated.ts";
import { rulingNoticeDeliveredMaterializer as project0Decision } from "@antumbra/server-storage/projections/rulings/ruling-notice-delivered.ts";
import { rulingParkedMaterializer as project5Decision } from "@antumbra/server-storage/projections/rulings/ruling-parked.ts";
import { rulingPassedUpMaterializer as project6Decision } from "@antumbra/server-storage/projections/rulings/ruling-passed-up.ts";
import { rulingProclaimedMaterializer as project7Decision } from "@antumbra/server-storage/projections/rulings/ruling-proclaimed.ts";
import { rulingReclassifiedMaterializer as project8Decision } from "@antumbra/server-storage/projections/rulings/ruling-reclassified.ts";
import { rulingRequestedMaterializer as project9Decision } from "@antumbra/server-storage/projections/rulings/ruling-requested.ts";
import { rulingSupersededMaterializer as project10Decision } from "@antumbra/server-storage/projections/rulings/ruling-superseded.ts";
import { rulingWithdrawnMaterializer as project11Decision } from "@antumbra/server-storage/projections/rulings/ruling-withdrawn.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
export const apply = Effect.fn("ExecutionProjection.rulings")(function* (event: Event<StampedEvent>) {
	if (!Schema.is(DomainEvents)(event.value)) return;
	const value = event.value;
	switch (value._tag) {
		case "RulingNoticeDelivered": {
			const payload = yield* Schema.decodeUnknownEffect(project0Fact.Payload)(value).pipe(Effect.orDie);
			yield* project0Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingAnswered": {
			const payload = yield* Schema.decodeUnknownEffect(project1Fact.Payload)(value).pipe(Effect.orDie);
			yield* project1Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingContextAdded": {
			const payload = yield* Schema.decodeUnknownEffect(project2Fact.Payload)(value).pipe(Effect.orDie);
			yield* project2Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingDelivered": {
			const payload = yield* Schema.decodeUnknownEffect(project3Fact.Payload)(value).pipe(Effect.orDie);
			yield* project3Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingGated": {
			const payload = yield* Schema.decodeUnknownEffect(project4Fact.Payload)(value).pipe(Effect.orDie);
			yield* project4Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingParked": {
			const payload = yield* Schema.decodeUnknownEffect(project5Fact.Payload)(value).pipe(Effect.orDie);
			yield* project5Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingPassedUp": {
			const payload = yield* Schema.decodeUnknownEffect(project6Fact.Payload)(value).pipe(Effect.orDie);
			yield* project6Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingProclaimed": {
			const payload = yield* Schema.decodeUnknownEffect(project7Fact.Payload)(value).pipe(Effect.orDie);
			yield* project7Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingReclassified": {
			const payload = yield* Schema.decodeUnknownEffect(project8Fact.Payload)(value).pipe(Effect.orDie);
			yield* project8Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingRequested": {
			const payload = yield* Schema.decodeUnknownEffect(project9Fact.Payload)(value).pipe(Effect.orDie);
			yield* project9Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingSuperseded": {
			const payload = yield* Schema.decodeUnknownEffect(project10Fact.Payload)(value).pipe(Effect.orDie);
			yield* project10Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "RulingWithdrawn": {
			const payload = yield* Schema.decodeUnknownEffect(project11Fact.Payload)(value).pipe(Effect.orDie);
			yield* project11Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}

		default:
			return value satisfies never;
	}
});
