import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { Effect } from "effect";
import { observeActivity } from "#activity.ts";
import { RunnerLog } from "#log.ts";
import type { Attachment } from "#state.ts";

export const record = Effect.fn("RunnerFabric.event")(function* (entry: Attachment, sessionId: string, event: AgentEvent) {
	const log = yield* RunnerLog;
	observeActivity(entry.activity, event);
	yield* log.append({ type: "ProviderEvent", sessionId, event });
});
