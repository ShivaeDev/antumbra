import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { BackendFailure } from "@antumbra/runner-ports/backend.ts";
import { bind } from "@antumbra/runner-tools/bind.ts";
import { ToolDispatch } from "@antumbra/runner-tools/dispatch.ts";
import { Deferred, Effect, Exit, Fiber, Option, Scope, Stream } from "effect";
import { activity } from "#activity.ts";
import { audit } from "#audit.ts";
import { confirm } from "#confirm.ts";
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
	const native = yield* Deferred.make<string, BackendFailure>();
	const entry: Attachment = { agentId: options.agentId, scope, activity: activity(), handle: undefined, opened: native };
	state.attachments.set(sessionId, entry);
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
			if (event.type === "session.opened") yield* confirm(entry, operation, event.nativeRef);
			yield* record(entry, sessionId, event, "live");
			if (event.type === "subsession.ended") {
				const root = yield* handle.nativeRef;
				if (Option.isSome(root)) yield* audit(entry, operation, root.value, event.subsessionRef);
			}
		});
		const detached = Effect.gen(function* () {
			if (state.attachments.get(sessionId) !== entry) return;
			state.attachments.delete(sessionId);
			yield* log.append({ type: "SessionDetached", sessionId });
			yield* Scope.close(scope, Exit.void).pipe(Effect.forkIn(state.lifetime));
		});
		yield* handle.events.pipe(
			Stream.runForEach(observed),
			Effect.tapCause((cause) => Deferred.failCause(native, cause)),
			Effect.ensuring(detached),
			Effect.ensuring(Deferred.fail(native, new BackendFailure({ tag: options.backend, detail: "session ended before native identity" }))),
			Effect.tapCause((cause) => Effect.logError("session stream ended", cause)),
			Effect.provideService(RunnerLog, log),
			Effect.provideService(BackendRegistry, registry),
			Effect.provideService(RunnerIdentity, identity),
			Effect.forkIn(scope),
		);
	});
	const failed = (exit: Exit.Exit<void, BackendFailure>) =>
		Effect.gen(function* () {
			if (Exit.isSuccess(exit)) return;
			yield* Scope.close(scope, Exit.void);
			if (state.attachments.get(sessionId) === entry) state.attachments.delete(sessionId);
		});
	return yield* started.pipe(
		Effect.onExit(failed),
		Effect.matchEffect({
			onSuccess: () => Effect.succeed(accepted),
			onFailure: (error) => log.append({ type: "SessionFailed", requestId, sessionId, reason: error.detail }).pipe(Effect.as(refusal(error.detail))),
		}),
	);
});
