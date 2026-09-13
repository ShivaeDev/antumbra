import { berthHeld } from "@antumbra/domain-reclamation/facts/berth-held.ts";
import { berthReclaimFailed } from "@antumbra/domain-reclamation/facts/berth-reclaim-failed.ts";
import { berthReclaimed } from "@antumbra/domain-reclamation/facts/berth-reclaimed.ts";
import { berthId } from "@antumbra/domain-reclamation/ids.ts";
import type { LogEvent } from "@antumbra/platform-runner/log.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { type ObservedFact, observation as observed } from "@antumbra/server-journal/observe.ts";
import { Option } from "effect";

export const observation = (event: LogEvent): Option.Option<ObservedFact> => {
	switch (event.type) {
		case "BerthReclaimed":
			return Option.some(observed(berthReclaimed, { id: berthId(event.agentId, event.slug), claimRequestId: Request.make(event.requestId) }));
		case "BerthReclaimFailed":
			return Option.some(
				observed(berthReclaimFailed, {
					id: berthId(event.agentId, event.slug),
					claimRequestId: Request.make(event.requestId),
					reason: event.reason,
				}),
			);
		case "BerthReclaimHeld":
			return Option.some(
				observed(berthHeld, { id: berthId(event.agentId, event.slug), claimRequestId: Request.make(event.requestId), reason: event.reason }),
			);
		default:
			return Option.none();
	}
};
