import {
	type AgentBackend,
	noSessionAudit,
	type OpenSessionOptions,
	type SessionHandle,
	type SessionInput,
} from "@antumbra/plugin-api";
import { Effect, Option, Stream } from "effect";
import type { EventSink } from "#session-attachment.ts";

// why: these tests are about attachment, not about the record, so the sink
// takes every event and has nothing to say when the stream ends.
export const sink: EventSink = {
	attached: Effect.void,
	detached: Effect.void,
	record: () => Effect.succeed(true),
};

// why: an attachment that must fail before anything is recorded takes a sink
// that refuses every event, so a test cannot pass on a record that was written.
export const refusingSink: EventSink = {
	attached: Effect.void,
	detached: Effect.void,
	record: () => Effect.succeed(false),
};

export const options: OpenSessionOptions = {
	cwd: "/tmp/session-fabric",
	resume: Option.some("native-fabric"),
	sessionId: "session-fabric",
	tools: [],
};

export const textInput = (text: string): SessionInput => ({
	parts: [{ text, type: "text" }],
});

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
	audit: noSessionAudit,
	capabilities: {
		fork: false,
		imageInput: false,
		liveInterrupt: true,
		multiClient: false,
	},
	openSession,
	tag: "scripted",
});
