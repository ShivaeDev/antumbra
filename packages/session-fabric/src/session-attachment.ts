import type { AgentBackend, OpenSessionOptions, SessionHandle } from "@antumbra/plugin-api";
import { BackendFailure } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Exit, Scope, Stream } from "effect";
import type { SessionAttachmentFailure } from "#errors.ts";
import { makeOpeningConfirmation } from "#session-opening.ts";

export interface EventSink {
	readonly attached: Effect.Effect<void>;
	readonly detached: Effect.Effect<void>;
	readonly record: (event: AgentEvent) => Effect.Effect<boolean>;
}

export interface SessionAttachment {
	readonly handle: SessionHandle;
	readonly openedNativeRef: Effect.Effect<string, BackendFailure | SessionAttachmentFailure>;
}

export interface LiveSessionAttachment extends SessionAttachment {
	readonly scope: Scope.Closeable;
}

export const closeSessionAttachment = (attachment: LiveSessionAttachment, exit: Exit.Exit<unknown, unknown> = Exit.void) =>
	Scope.close(attachment.scope, exit);

export const openSessionAttachment = Effect.fn("SessionFabric.openSessionAttachment")(function* (
	backend: AgentBackend,
	options: OpenSessionOptions,
	sink: EventSink,
) {
	const scope = yield* Scope.make();
	return yield* Effect.gen(function* () {
		const handle = yield* backend.openSession(options).pipe(Scope.provide(scope));
		const opened = yield* makeOpeningConfirmation;
		yield* sink.attached;
		const observe = (event: AgentEvent) =>
			sink.record(event).pipe(
				Effect.flatMap((persisted) => opened.observe(event, persisted)),
				Effect.asVoid,
			);
		const endedBeforeOpening = new BackendFailure({
			detail: "session ended before confirming its native identity",
			tag: backend.tag,
		});
		yield* handle.events.pipe(
			Stream.runForEach(observe),
			Effect.tapError(opened.fail),
			Effect.ensuring(opened.fail(endedBeforeOpening)),
			Effect.ensuring(sink.detached),
			Effect.catchCause((cause) => Effect.logError("event pump failed", { sessionId: options.sessionId }, cause)),
			Effect.forkIn(scope),
		);
		return {
			handle,
			openedNativeRef: opened.await,
			scope,
		} satisfies LiveSessionAttachment;
	}).pipe(Effect.onExit((exit) => (Exit.isFailure(exit) ? Scope.close(scope, exit) : Effect.void)));
});
