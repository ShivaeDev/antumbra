import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect } from "effect";
import { recordTogether } from "#record-together.ts";

export const record = Effect.fn("SessionEventJournal.record")((sessionId: string, event: AgentEvent) =>
	recordTogether({ appends: [{ event, sessionId }], rows: Effect.void }),
);
