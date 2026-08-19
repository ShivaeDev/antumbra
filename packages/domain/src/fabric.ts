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

export type { EventSink, SessionAttachment } from "#session-attachment.ts";

const SessionStartPermitTypeId = Symbol("@antumbra/domain/SessionStartPermit");

export interface SessionStartPermit {
	readonly [SessionStartPermitTypeId]: true;
}

const sessionStartPermit: SessionStartPermit = {
	[SessionStartPermitTypeId]: true,
};

export interface SessionFabricService {
	readonly closeStarts: Effect.Effect<void>;
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
	readonly stop: (sessionId: string) => Effect.Effect<void>;
	readonly withStartAdmission: <A, E, R>(
		use: (permit: SessionStartPermit) => Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E, R>;
}

export class SessionFabric extends Context.Service<
	SessionFabric,
	SessionFabricService
>()("@antumbra/domain/SessionFabric") {}

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
		lifecycles.admit(
			options.sessionId,
			attachments.attach(agentId, backend, options, sink, admit),
		);
	const stop: SessionFabricService["stop"] = (sessionId) =>
		lifecycles.stop(sessionId, attachments.stop(sessionId));
	return {
		closeStarts: startAdmission.close,
		interrupt: attachments.interrupt,
		reopenStarts: startAdmission.reopen,
		start,
		stop,
		withStartAdmission: (use) =>
			startAdmission.run(Effect.suspend(() => use(sessionStartPermit))),
	} satisfies SessionFabricService;
});

export const SessionFabricLive = Layer.effect(SessionFabric)(makeSessionFabric);
