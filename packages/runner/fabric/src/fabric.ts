import type { Input } from "@antumbra/platform-runner/input.ts";
import type { Operation, OperationResult } from "@antumbra/platform-runner/operations.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { BackendFailure, type SessionHandle } from "@antumbra/runner-ports/backend.ts";
import { bind } from "@antumbra/runner-tools/bind.ts";
import { ToolDispatch } from "@antumbra/runner-tools/dispatch.ts";
import { Context, Deferred, Effect, Exit, Layer, Option, Scope, Stream } from "effect";
import { type Activity, activity, observeActivity, observeCensus, settled } from "#activity.ts";
import { RunnerLog } from "#log.ts";
import { BackendRegistry, InputResolver, RunnerIdentity, ServerTools } from "#ports.ts";

type Opening = Extract<Operation, { type: "Start" | "Wake" }>;
interface Attachment {
	readonly agentId: string;
	readonly scope: Scope.Closeable;
	readonly activity: Activity;
	handle: SessionHandle | undefined;
}
export class RunnerFabric extends Context.Service<
	RunnerFabric,
	{
		readonly execute: (operation: Operation) => Effect.Effect<OperationResult>;
		readonly attached: Effect.Effect<ReadonlySet<string>>;
	}
>()("@antumbra/runner-fabric/RunnerFabric") {}

export const layer = Layer.effect(RunnerFabric)(
	Effect.gen(function* () {
		const log = yield* RunnerLog;
		const registry = yield* BackendRegistry;
		const resolver = yield* InputResolver;
		const server = yield* ServerTools;
		const identity = yield* RunnerIdentity;
		const lifetime = yield* Scope.Scope;
		const attachments = new Map<string, Attachment>();
		const pending = new Map<string, Deferred.Deferred<OperationResult>>();
		let accepting = true;
		const refusal = (reason: string): OperationResult => ({ type: "Refused", reason });
		const accepted: OperationResult = { type: "Accepted" };
		const close = Effect.fn("RunnerFabric.close")(function* (sessionId: string) {
			const entry = attachments.get(sessionId);
			if (entry === undefined) return;
			attachments.delete(sessionId);
			yield* Scope.close(entry.scope, Exit.void);
		});
		const dispatch = {
			call: Effect.fn("RunnerFabric.tool")(function* (call: Parameters<typeof server.call>[0]) {
				const entry = attachments.get(call.sessionId);
				entry?.activity.tools.add(call.callId);
				return yield* Effect.gen(function* () {
					const previous = yield* log.tool(call.sessionId, call.callId);
					const answered = previous.find(({ event }) => event.type === "ToolAnswered");
					if (answered?.event.type === "ToolAnswered") return answered.event.answer;
					if (previous.length === 0) yield* log.append({ type: "ToolCalled", ...call });
					const answer = yield* server.call(call);
					yield* log.append({ type: "ToolAnswered", sessionId: call.sessionId, callId: call.callId, answer });
					return answer;
				}).pipe(Effect.ensuring(Effect.sync(() => entry?.activity.tools.delete(call.callId))));
			}),
		};
		const deliver = Effect.fn("RunnerFabric.deliver")(function* (requestId: string, sessionId: string, input: Input, act: "queue" | "steer") {
			const entry = attachments.get(sessionId);
			if (entry?.handle === undefined)
				return yield* log
					.append({ type: "InputFailed", requestId, sessionId, inputId: input.id, reason: "session is not attached" })
					.pipe(Effect.as(refusal("session is not attached")));
			const evidence = yield* log.request(requestId);
			const failed = evidence.find(({ event }) => (event.type === "InputFailed" || event.type === "InputAmbiguous") && event.inputId === input.id);
			if (failed?.event.type === "InputFailed" || failed?.event.type === "InputAmbiguous") return refusal(failed.event.reason);
			const delivered = evidence.some(({ event }) => event.type === "InputAccepted" && event.inputId === input.id);
			if (delivered) return accepted;
			const resolved = yield* resolver.resolve(input);
			entry.activity.working = true;
			return yield* entry.handle[act](resolved).pipe(
				Effect.andThen(log.append({ type: "InputAccepted", requestId, sessionId, inputId: input.id })),
				Effect.as(accepted),
				Effect.catchTag("BackendFailure", (error) =>
					log
						.append({ type: "InputAmbiguous", requestId, sessionId, inputId: input.id, reason: error.detail })
						.pipe(Effect.as(refusal(error.detail))),
				),
			);
		});
		const acquire = Effect.fn("RunnerFabric.acquire")(function* (operation: Opening) {
			const { requestId, sessionId, options } = operation;
			const backend = registry.backends.get(options.backend);
			if (backend === undefined) return refusal(`backend ${options.backend} is unavailable`);
			if ([...attachments.values()].some((entry) => entry.agentId === options.agentId)) return refusal("agent already has an attached session");
			const scope = yield* Scope.fork(lifetime);
			const entry: Attachment = { agentId: options.agentId, scope, activity: activity(), handle: undefined };
			attachments.set(sessionId, entry);
			const native = yield* Deferred.make<string, BackendFailure>();
			const tools = yield* bind(sessionId, options.toolSet).pipe(Effect.provideService(ToolDispatch, dispatch));
			const acquired = backend.openSession({
				sessionId,
				cwd: options.cwd,
				model: Option.fromNullishOr(options.model),
				effort: Option.fromNullishOr(options.effort),
				resume: operation.type === "Wake" ? Option.some(operation.nativeRef) : Option.none(),
				...(options.constrainedPrompt === null ? {} : { constrainedPrompt: options.constrainedPrompt }),
				tools,
			});
			const started = Effect.gen(function* () {
				entry.handle = yield* acquired.pipe(Scope.provide(scope));
				const record = Effect.fn("RunnerFabric.event")(function* (event: AgentEvent) {
					yield* log.append({ type: "ProviderEvent", sessionId, event });
					observeActivity(entry.activity, event);
					if (event.type === "session.opened") yield* Deferred.succeed(native, event.nativeRef);
				});
				const audit = Effect.fn("RunnerFabric.audit")(function* (nodeRef?: string) {
					const handle = entry.handle;
					if (handle === undefined) return;
					const rootRef = yield* handle.nativeRef;
					if (Option.isNone(rootRef)) return;
					entry.activity.audits++;
					yield* Effect.gen(function* () {
						const stored = (yield* log.read(-1)).flatMap(({ event }) =>
							event.type === "ProviderEvent" && event.sessionId === sessionId ? [event.event] : [],
						);
						const known = new Set(stored.flatMap((event) => (event.type === "subsession.opened" ? [event.subsessionRef] : [])));
						const recorded = new Set(stored.map((event) => event.raw.payload));
						const appendFresh = (events: ReadonlyArray<AgentEvent>) =>
							Effect.forEach(
								events.filter((event) => !recorded.has(event.raw.payload)),
								record,
								{ discard: true },
							);
						if (nodeRef !== undefined)
							yield* appendFresh(
								yield* backend.audit.node({ cwd: options.cwd, nodeRef, rootRef: rootRef.value, recorded: Effect.succeed([...recorded]) }),
							);
						const census = yield* backend.audit.census({ cwd: options.cwd, rootRef: rootRef.value, admitted: (node) => known.has(node) });
						yield* appendFresh(census.events);
						observeCensus(entry.activity, census.nodes);
					}).pipe(
						Effect.ensuring(
							Effect.sync(() => {
								entry.activity.audits--;
							}),
						),
					);
				});
				const streamed = (event: AgentEvent) =>
					record(event).pipe(Effect.andThen(event.type === "subsession.ended" ? audit(event.subsessionRef) : Effect.void));

				yield* entry.handle.events.pipe(
					Stream.runForEach(streamed),
					Effect.ensuring(
						Effect.gen(function* () {
							if (attachments.get(sessionId) === entry) {
								attachments.delete(sessionId);
								yield* log.append({ type: "SessionDetached", sessionId });
							}
						}),
					),
					Effect.ensuring(Deferred.fail(native, new BackendFailure({ tag: options.backend, detail: "session ended before native identity" }))),
					Effect.catchCause((cause) => Effect.logError("session stream ended", cause)),
					Effect.forkIn(scope),
				);
				const nativeRef = yield* Deferred.await(native);
				if (operation.type === "Wake") yield* audit();
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
							Effect.andThen(Effect.sync(() => attachments.delete(sessionId))),
							Effect.andThen(log.append({ type: "SessionFailed", requestId, sessionId, reason: error.detail })),
							Effect.as(refusal(error.detail)),
						),
				}),
			);
		});
		const open = Effect.fn("RunnerFabric.open")(function* (operation: Opening) {
			const { requestId, sessionId } = operation;
			if (!accepting) return refusal("runner is draining");
			const evidence = yield* log.request(requestId);
			const failed = evidence.find(({ event }) => event.type === "SessionFailed");
			if (failed?.event.type === "SessionFailed") return refusal(failed.event.reason);
			const opened = evidence.some(({ event }) => event.type === "SessionStarted" || event.type === "SessionWoke");
			if (opened && !attachments.has(sessionId)) return accepted;
			if (!attachments.has(sessionId)) {
				const result = yield* acquire(operation);
				if (result.type === "Refused") return result;
			}
			return yield* deliver(requestId, sessionId, operation.type === "Start" ? operation.charter : operation.instruction, "queue");
		});
		const run = Effect.fn("RunnerFabric.operation")(function* (operation: Operation): Effect.fn.Return<OperationResult> {
			switch (operation.type) {
				case "Start":
				case "Wake":
					return yield* open(operation);
				case "Deliver":
					return yield* deliver(operation.requestId, operation.sessionId, operation.input, operation.act);
				case "Interrupt": {
					const handle = attachments.get(operation.sessionId)?.handle;
					return handle === undefined
						? refusal("session is not attached")
						: yield* handle.interrupt.pipe(
								Effect.andThen(log.append({ type: "SessionInterrupted", requestId: operation.requestId, sessionId: operation.sessionId })),
								Effect.as(accepted),
								Effect.catchTag("BackendFailure", (error) => Effect.succeed(refusal(error.detail))),
							);
				}
				case "Sleep":
					if (!settled(attachments.get(operation.sessionId)?.activity ?? activity())) return refusal("session still has active work");
					yield* close(operation.sessionId);
					yield* log.append({ type: "SessionSlept", requestId: operation.requestId, sessionId: operation.sessionId });
					return accepted;
				case "Stop":
					yield* close(operation.sessionId);
					yield* log.append({ type: "SessionEnded", requestId: operation.requestId, sessionId: operation.sessionId, reason: operation.reason });
					return accepted;
				case "Drain":
					accepting = false;
					for (const sessionId of attachments.keys()) {
						yield* close(sessionId);
						yield* log.append({ type: "SessionSlept", requestId: operation.requestId, sessionId });
					}
					return accepted;
				default:
					return refusal("operation is not a session operation");
			}
		});
		const execute = Effect.fn("RunnerFabric.execute")(function* (operation: Operation) {
			const history = yield* log.request(operation.requestId);
			const done = history.some(
				({ event }) =>
					(operation.type === "Stop" && event.type === "SessionEnded") ||
					(operation.type === "Sleep" && event.type === "SessionSlept") ||
					(operation.type === "Interrupt" && event.type === "SessionInterrupted"),
			);
			if (done) return accepted;
			const existing = pending.get(operation.requestId);
			if (existing !== undefined) return yield* Deferred.await(existing);
			const result = yield* Deferred.make<OperationResult>();
			pending.set(operation.requestId, result);
			return yield* run(operation).pipe(
				Effect.tap((value) => Deferred.succeed(result, value)),
				Effect.onExit((exit) => (Exit.isFailure(exit) ? Deferred.interrupt(result) : Effect.void)),
				Effect.ensuring(Effect.sync(() => pending.delete(operation.requestId))),
			);
		});
		return { execute, attached: Effect.sync(() => new Set(attachments.keys())) };
	}),
);
