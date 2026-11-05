import { berthHeld as project4Fact } from "@antumbra/domain-reclamation/facts/berth-held.ts";
import { berthReclaimFailed as project5Fact } from "@antumbra/domain-reclamation/facts/berth-reclaim-failed.ts";
import { berthReclaimed as project3Fact } from "@antumbra/domain-reclamation/facts/berth-reclaimed.ts";
import { mooragePlanned as project0Fact } from "@antumbra/domain-reclamation/facts/moorage-planned.ts";
import { moorageReady as project1Fact } from "@antumbra/domain-reclamation/facts/moorage-ready.ts";
import { resourcesClaimed as project2Fact } from "@antumbra/domain-reclamation/facts/resources-claimed.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Events as DomainEvents } from "@antumbra/server-reclamation/events.ts";
import type { StampedEvent } from "@antumbra/server-storage/execution/definition.ts";
import { berthHeldMaterializer as project4Decision } from "@antumbra/server-storage/projections/reclamation/berth-held.ts";
import { berthReclaimFailedMaterializer as project5Decision } from "@antumbra/server-storage/projections/reclamation/berth-reclaim-failed.ts";
import { berthReclaimedMaterializer as project3Decision } from "@antumbra/server-storage/projections/reclamation/berth-reclaimed.ts";
import { mooragePlannedMaterializer as project0Decision } from "@antumbra/server-storage/projections/reclamation/moorage-planned.ts";
import { moorageReadyMaterializer as project1Decision } from "@antumbra/server-storage/projections/reclamation/moorage-ready.ts";
import { resourcesClaimedMaterializer as project2Decision } from "@antumbra/server-storage/projections/reclamation/resources-claimed.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { Effect, Schema } from "effect";
export const apply = Effect.fn("ExecutionProjection.reclamation")(function* (event: Event<StampedEvent>) {
	if (!Schema.is(DomainEvents)(event.value)) return;
	const value = event.value;
	switch (value._tag) {
		case "MooragePlanned": {
			const payload = yield* Schema.decodeUnknownEffect(project0Fact.Payload)(value).pipe(Effect.orDie);
			yield* project0Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "MoorageReady": {
			const payload = yield* Schema.decodeUnknownEffect(project1Fact.Payload)(value).pipe(Effect.orDie);
			yield* project1Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "ResourcesClaimed": {
			const payload = yield* Schema.decodeUnknownEffect(project2Fact.Payload)(value).pipe(Effect.orDie);
			yield* project2Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "BerthReclaimed": {
			const payload = yield* Schema.decodeUnknownEffect(project3Fact.Payload)(value).pipe(Effect.orDie);
			yield* project3Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "BerthHeld": {
			const payload = yield* Schema.decodeUnknownEffect(project4Fact.Payload)(value).pipe(Effect.orDie);
			yield* project4Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}
		case "BerthReclaimFailed": {
			const payload = yield* Schema.decodeUnknownEffect(project5Fact.Payload)(value).pipe(Effect.orDie);
			yield* project5Decision({ ...payload, at: value.at, seq: value.sequence, requestId: Request.make(event.requestId) });
			break;
		}

		default:
			return value satisfies never;
	}
});
