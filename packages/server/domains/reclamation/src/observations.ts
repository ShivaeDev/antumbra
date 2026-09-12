import type { FactPayload } from "@antumbra/platform-feature/fact.ts";
import type { LogEvent } from "@antumbra/platform-runner/log.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Option } from "effect";
import { berthHeld } from "#facts/berth-held.ts";
import { berthReclaimed } from "#facts/berth-reclaimed.ts";
import { moorageReady } from "#facts/moorage-ready.ts";
import { berthId } from "#ids.ts";

type ResourceObservation =
	| { readonly fact: typeof moorageReady; readonly payload: FactPayload<typeof moorageReady> }
	| { readonly fact: typeof berthHeld; readonly payload: FactPayload<typeof berthHeld> }
	| { readonly fact: typeof berthReclaimed; readonly payload: FactPayload<typeof berthReclaimed> };

export const observation = (event: LogEvent): Option.Option<ResourceObservation> => {
	switch (event.type) {
		case "MoorageProvisioned":
			return Option.some({ fact: moorageReady, payload: { agentId: event.agentId } });
		case "BerthReclaimed":
			return Option.some({
				fact: berthReclaimed,
				payload: { id: berthId(event.agentId, event.slug), claimRequestId: Request.make(event.requestId) },
			});
		case "BerthReclaimHeld":
			return Option.some({
				fact: berthHeld,
				payload: { id: berthId(event.agentId, event.slug), claimRequestId: Request.make(event.requestId), reason: event.reason },
			});
		default:
			return Option.none();
	}
};
