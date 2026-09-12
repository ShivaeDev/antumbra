import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { BackendFailure } from "@antumbra/runner-ports/backend.ts";
import { bind } from "@antumbra/runner-tools/bind.ts";
import { ToolDispatch } from "@antumbra/runner-tools/dispatch.ts";
import { Deferred, Effect, Exit, Fiber, Option, Scope, Stream } from "effect";
import { activity } from "#activity.ts";
import { audit } from "#audit.ts";
import { RunnerLog } from "#log.ts";
import { BackendRegistry, RunnerIdentity, ServerTools } from "#ports.ts";
import { record } from "#record.ts";
import { type Attachment, accepted, type Opening, refusal, type State } from "#state.ts";
import { tool } from "#tool.ts";

export const acquire = Effect.fn("RunnerFabric.acquire")(function* (state: State, operation: Opening) {
	const log = yield* RunnerLog;
	const registry = yield* BackendRegistry;
	const identity = yield* RunnerIdentity;
	const server = yield* ServerTools;
	const { requestId, sessionId, options } = operation;
	const backend = registry.backends.get(options.backend);
	if (backend === undefined)
		return yield* log
			.append({ type: "SessionFailed", requestId, sessionId, reason: `backend ${options.backend} is unavailable` })
			.pipe(Effect.as(refusal(`backend ${options.backend} is unavailable`)));
	if ([...state.attachments.values()].some((entry) => entry.agentId === options.agentId)) return refusal("agent already has an attached session");
	const scope = yield* Scope.fork(state.lifetime);
	const entry: Attachment = { agentId: options.agentId, scope, activity: activity(), handle: undefined };
	state.attachments.set(sessionId, entry);
	const native = yield* Deferred.make<string, BackendFailure>();
	const tools = yield* bind(sessionId, options.toolSet).pipe(
		Effect.provideService(ToolDispatch, {
			call: (call) => tool(state, call).pipe(Effect.provideService(RunnerLog, log), Effect.provideService(ServerTools, server)),
		}),
	);
	const started = Effect.gen(function* () {
		const handle = yield* backend
			.openSession({
				sessionId,
				cwd: options.cwd,
				model: Option.fromNullishOr(options.model),
				effort: Option.fromNullishOr(options.effort),
				resume: operation.type === "Wake" ? Option.some(operation.nativeRef) : Option.none(),
				...(options.constrainedPrompt === null ? {} : { constrainedPrompt: options.constrainedPrompt }),
				tools,
			})
			.pipe(Scope.provide(scope), Effect.forkIn(scope), Effect.flatMap(Fiber.join));
		entry.handle = handle;
		const observed = Effect.fn("RunnerFabric.observe")(function* (event: AgentEvent) {
			yield* record(entry, sessionId, event);
			if (event.type === "session.opened") yield* Deferred.succeed(native, event.nativeRef);
			if (event.type === "subsession.ended") {
				const root = yield* handle.nativeRef;
				if (Option.isSome(root)) yield* audit(entry, operation, root.value, event.subsessionRef);
			}
		});
		const detached = Effect.gen(function* () {
			if (state.attachments.get(sessionId) !== entry) return;
			state.attachments.delete(sessionId);
			yield* log.append({ type: "SessionDetached", sessionId });
		});
		yield* handle.events.pipe(
			Stream.runForEach(observed),
			Effect.tapCause((cause) => Deferred.failCause(native, cause)),
			Effect.ensuring(detached),
			Effect.ensuring(Deferred.fail(native, new BackendFailure({ tag: options.backend, detail: "session ended before native identity" }))),
			Effect.tapCause((cause) => Effect.logError("session stream ended", cause)),
			Effect.provideService(RunnerLog, log),
			Effect.provideService(BackendRegistry, registry),
			Effect.forkIn(scope),
		);
		const nativeRef = yield* Deferred.await(native);
		if (operation.type === "Wake") yield* audit(entry, operation, nativeRef);
		yield* log.append(
			operation.type === "Start"
				? {
						type: "SessionStarted",
						requestId,
						sessionId,
						agentId: options.agentId,
						backend: options.backend,
						cwd: options.cwd,
						nativeRef,
						toolSetVersion: options.toolSet.version,
						runnerId: identity.runnerId,
					}
				: { type: "SessionWoke", requestId, sessionId, runnerId: identity.runnerId },
		);
	});
	return yield* started.pipe(
		Effect.matchEffect({
			onSuccess: () => Effect.succeed(accepted),
			onFailure: (error) =>
				Scope.close(scope, Exit.void).pipe(
					Effect.andThen(Effect.sync(() => state.attachments.delete(sessionId))),
					Effect.andThen(log.append({ type: "SessionFailed", requestId, sessionId, reason: error.detail })),
					Effect.as(refusal(error.detail)),
				),
		}),
	);
});
