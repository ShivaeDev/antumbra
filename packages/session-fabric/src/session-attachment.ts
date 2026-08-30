import type { AgentBackend, OpenSessionOptions, SessionHandle } from "@antumbra/plugin-api";
import { BackendFailure } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Exit, Scope, Stream } from "effect";
import type { SessionAttachmentFailure } from "#errors.ts";
import { makeOpeningConfirmation } from "#session-opening.ts";

export interface EventSink {
	// why: the pump's start is a fact about the Session too — it is the moment
	// the record can ask the provider about work that ended while nothing was
	// listening. The fabric says when, the sink decides what to make of it, and
	// it runs before any frame so nothing the pump carries is read twice.
	readonly attached: Effect.Effect<void>;
	// why: the pump's end is itself a fact about the Session. Only the sink can
	// say what was left unfinished when the provider stopped talking, and only
	// the fabric knows the moment it stopped — so the fabric says when, and the
	// sink decides what that silence means for the record.
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

export const openSessionAttachment = (backend: AgentBackend, options: OpenSessionOptions, sink: EventSink) =>
	Effect.gen(function* () {
		const scope = yield* Scope.make();
		return yield* Effect.gen(function* () {
			const handle = yield* backend.openSession(options).pipe(Scope.provide(scope));
			const opened = yield* makeOpeningConfirmation;
			yield* sink.attached;
			// why: the confirmation watches the pump, and the pump carries only what
			// the provider said to the root Session. A node's opening is minted by
			// the sink and written straight to that node's journal, so it never
			// reaches here and can never stand in for the root's native identity.
			const observe = (event: AgentEvent) =>
				sink.record(event).pipe(
					Effect.flatMap((persisted) => opened.observe(event, persisted)),
					Effect.asVoid,
				);
			const endedBeforeOpening = new BackendFailure({
				detail: "session ended before confirming its native identity",
				tag: backend.tag,
			});
			// why: a dead pump must be visible, never fatal — the session lives on
			// and the gap in the event log is the trace.
			// why: the opening is failed before the sink is told, because the sink's
			// parting write is the record catching up and whoever is waiting on the
			// opening is a caller with nothing to wait for any more. Told in the
			// other order, a slow parting write turns a dead pump — a fact the
			// waiter could act on — into a silence indistinguishable from a provider
			// that simply never spoke.
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
