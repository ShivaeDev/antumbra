import type {
	AgentBackend,
	BackendFailure,
	OpenSessionOptions,
} from "@antumbra/plugin-api";
import { Context, Effect, Layer } from "effect";
import type { SessionAttachmentFailure, SessionNotLive } from "#errors.ts";
import type { EventSink, SessionAttachment } from "#session-attachment.ts";
import { makeSessionAttachmentRegistry } from "#session-attachment-registry.ts";
import { makeSessionLifecycles } from "#session-lifecycle.ts";
import { makeSessionStartAdmission } from "#session-start-admission.ts";

const SessionStartPermitTypeId = Symbol(
	"@antumbra/session-fabric/SessionStartPermit",
);

export interface SessionStartPermit {
	readonly [SessionStartPermitTypeId]: true;
}

const sessionStartPermit: SessionStartPermit = {
	[SessionStartPermitTypeId]: true,
};

export interface SessionFabricService {
	// why: every Session with a live acquisition right now. A reader asks this
	// rather than the database because whether words can be handed over is a
	// fact about this process, and the row cannot know it.
	readonly attached: Effect.Effect<ReadonlySet<string>>;
	readonly closeStarts: Effect.Effect<void>;
	readonly holds: (sessionId: string) => Effect.Effect<boolean>;
	// why: when each attached Session said it had nothing left to do. Policy
	// owns the threshold; the fabric only remembers the moment.
	readonly idleSince: Effect.Effect<ReadonlyMap<string, number>>;
	readonly interrupt: (
		sessionId: string,
	) => Effect.Effect<void, BackendFailure | SessionNotLive>;
	readonly start: <E, R>(
		permit: SessionStartPermit,
		agentId: string,
		backend: AgentBackend,
		options: OpenSessionOptions,
		sink: EventSink,
		admit: (attachment: SessionAttachment) => Effect.Effect<void, E, R>,
	) => Effect.Effect<void, BackendFailure | SessionAttachmentFailure | E, R>;
	readonly reopenStarts: Effect.Effect<void>;
	readonly send: (
		sessionId: string,
		text: string,
	) => Effect.Effect<void, BackendFailure | SessionNotLive>;
	// why: the Agent's own declaration that it has nothing left to do. It keeps
	// its acquisition; only the mark changes.
	readonly standDown: (sessionId: string) => Effect.Effect<void>;
	readonly stop: (sessionId: string) => Effect.Effect<void>;
	// why: reclaim the acquisition only while it is still standing down.
	// Answering false is how a Session that was spoken to in the meantime keeps
	// the attachment a reclaim had already chosen to take.
	readonly stopIdle: (sessionId: string) => Effect.Effect<boolean>;
	readonly withStartAdmission: <A, E, R>(
		use: (permit: SessionStartPermit) => Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E, R>;
}

export class SessionFabric extends Context.Service<
	SessionFabric,
	SessionFabricService
>()("@antumbra/session-fabric/SessionFabric") {}

// why: live handles only, never persisted — rebuilt empty at boot. Registry
// teardown is the single close path, so app shutdown cannot strand a provider.
export const makeSessionFabric = Effect.gen(function* () {
	const attachments = yield* makeSessionAttachmentRegistry;
	const lifecycles = yield* makeSessionLifecycles;
	const startAdmission = yield* makeSessionStartAdmission;
	const start: SessionFabricService["start"] = (
		_permit,
		agentId,
		backend,
		options,
		sink,
		admit,
	) =>
		lifecycles
			.admit(
				options.sessionId,
				attachments.attach(agentId, backend, options, sink, admit),
			)
			.pipe(Effect.annotateSpans({ agentId, sessionId: options.sessionId }));
	// why: the ids annotate the whole attachment, not just the span the seam
	// happens to be standing in, so every span a Session opens beneath it is
	// found by the Session it belongs to rather than by reading its parents.
	const stop: SessionFabricService["stop"] = (sessionId) =>
		lifecycles
			.stop(sessionId, attachments.stop(sessionId))
			.pipe(Effect.annotateSpans({ sessionId }));
	// why: the mark is read before the lifecycle is entered so a Session that is
	// plainly working is never made to raise its stop signal, and read again
	// under the claim so the answer cannot go stale between the two.
	const stopIdle: SessionFabricService["stopIdle"] = (sessionId) =>
		Effect.flatMap(attachments.idleSince, (idle) =>
			idle.has(sessionId)
				? lifecycles.stop(sessionId, attachments.stopIdle(sessionId))
				: Effect.succeed(false),
		).pipe(Effect.annotateSpans({ sessionId }));
	return {
		attached: attachments.attached,
		closeStarts: startAdmission.close,
		holds: attachments.holds,
		idleSince: attachments.idleSince,
		interrupt: attachments.interrupt,
		reopenStarts: startAdmission.reopen,
		send: attachments.send,
		standDown: attachments.standDown,
		start,
		stop,
		stopIdle,
		withStartAdmission: (use) =>
			startAdmission.run(Effect.suspend(() => use(sessionStartPermit))),
	} satisfies SessionFabricService;
});

export const SessionFabricLive = Layer.effect(SessionFabric)(makeSessionFabric);
