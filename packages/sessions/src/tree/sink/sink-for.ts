import type { SessionAudit } from "@antumbra/plugin-api";
import type { EventSink } from "@antumbra/session-fabric";
import type { Effect } from "effect";

export type SinkFor = (rootSessionId: string, audit: SessionAudit) => Effect.Effect<EventSink>;
