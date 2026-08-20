import type {
	AgentBackend,
	OpenSessionOptions,
	SessionHandle,
} from "@antumbra/plugin-api";
import { Effect, Option, Stream } from "effect";
import type { EventSink } from "#session-attachment.ts";

// why: these tests are about attachment, not about the record, so the sink
// takes every event and has nothing to say when the stream ends.
export const sink: EventSink = {
	detached: Effect.void,
	record: () => Effect.succeed(true),
};

export const options: OpenSessionOptions = {
	cwd: "/tmp/session-fabric",
	resume: Option.some("native-fabric"),
	sessionId: "session-fabric",
	tools: [],
};

export const idleHandle: SessionHandle = {
	events: Stream.empty,
	interrupt: Effect.void,
	nativeRef: Effect.succeed(Option.some("native-fabric")),
	queue: () => Effect.void,
	steer: () => Effect.void,
};

export const scriptedBackend = (
	openSession: AgentBackend["openSession"],
): AgentBackend => ({
	capabilities: { fork: false, liveInterrupt: true, multiClient: false },
	openSession,
	tag: "scripted",
});
