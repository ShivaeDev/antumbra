import type {
	AgentBackend,
	BackendFailure,
	OpenSessionOptions,
} from "@antumbra/plugin-api";
import {
	defineService,
	type ServiceRequirements,
} from "@antumbra/service-definition";
import { Effect } from "effect";
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

const requirements = [] as const;
type Requirements<
	Success,
	Failure = never,
	Passthrough = never,
> = ServiceRequirements<typeof requirements, Success, Failure, Passthrough>;

// why: live handles only, never persisted — rebuilt empty at boot. Registry
// teardown is the single close path, so app shutdown cannot strand a provider.
export const SessionFabric = defineService({
	id: "@antumbra/domain/SessionFabric",
	requires: requirements,
	operations: Effect.gen(function* () {
		const attachments = yield* makeSessionAttachmentRegistry;
		const lifecycles = yield* makeSessionLifecycles;
		const startAdmission = yield* makeSessionStartAdmission;
		const interrupt = Effect.fn("sessionFabric.interrupt")(function* (
			sessionId: string,
		): Requirements<void, BackendFailure | SessionNotLive> {
			yield* attachments.interrupt(sessionId);
		});
		const start = Effect.fn("sessionFabric.start")(function* <E, R>(
			_permit: SessionStartPermit,
			agentId: string,
			backend: AgentBackend,
			options: OpenSessionOptions,
			sink: EventSink,
			admit: (attachment: SessionAttachment) => Effect.Effect<void, E, R>,
		): Requirements<void, BackendFailure | SessionAttachmentFailure | E, R> {
			yield* lifecycles.admit(
				options.sessionId,
				attachments.attach(agentId, backend, options, sink, admit),
			);
		});
		const stop = Effect.fn("sessionFabric.stop")(function* (
			sessionId: string,
		): Requirements<void> {
			yield* lifecycles.stop(sessionId, attachments.stop(sessionId));
		});
		const withStartAdmission = Effect.fn("sessionFabric.withStartAdmission")(
			function* <A, E, R>(
				use: (permit: SessionStartPermit) => Effect.Effect<A, E, R>,
			): Requirements<A, E, R> {
				return yield* startAdmission.run(
					Effect.suspend(() => use(sessionStartPermit)),
				);
			},
		);
		return {
			closeStarts: startAdmission.close,
			interrupt,
			reopenStarts: startAdmission.reopen,
			start,
			stop,
			withStartAdmission,
		};
	}),
});
