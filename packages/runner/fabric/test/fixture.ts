import type { Operation } from "@antumbra/platform-runner/operations.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { AgentBackend, OpenSessionOptions, SessionInput } from "@antumbra/runner-ports/backend.ts";
import { noSessionAudit } from "@antumbra/runner-ports/session-audit.ts";
import { callWhileOpen } from "@antumbra/runner-ports/tool-call.ts";
import { type Cause, Deferred, Effect, Layer, Option, Queue, Scope, Stream } from "effect";
import { layer } from "#fabric.ts";
import { file } from "#log.ts";
import { BackendRegistry, InputResolver, RunnerIdentity, ServerTools } from "#ports.ts";

export const start: Extract<Operation, { type: "Start" }> = {
	type: "Start",
	requestId: "start",
	sessionId: "session",
	options: {
		agentId: "agent",
		backend: "scripted",
		cwd: "/work",
		model: null,
		effort: null,
		constrainedPrompt: null,
		toolSet: { version: "1", tools: [] },
	},
	charter: { id: "charter", parts: [{ type: "text", text: "work" }] },
};

export const fixture = Effect.gen(function* () {
	const events = yield* Queue.unbounded<AgentEvent, Cause.Done>();
	const queued: SessionInput[] = [];
	const delivering = yield* Deferred.make<void>();
	const releaseDelivery = yield* Deferred.make<void>();
	let blocked = false;
	let inputOpens = false;
	let failNext = false;
	let nativeOverride: string | undefined;
	const released = yield* Deferred.make<void>();
	const steered: SessionInput[] = [];
	const auditEvents: AgentEvent[] = [];
	const nodeEvents: AgentEvent[] = [];
	const acquisitions: OpenSessionOptions[] = [];
	const forwarded = yield* Deferred.make<void>();
	const answer = yield* Deferred.make<{ ok: boolean; text: string }>();
	let opens = 0;
	const backend: AgentBackend = {
		tag: "scripted",
		audit: { ...noSessionAudit, node: () => Effect.succeed(nodeEvents), census: () => Effect.succeed({ events: auditEvents, nodes: [] }) },
		capabilities: { imageInput: true },
		listModels: Effect.succeed([]),
		openSession: (options) =>
			Effect.gen(function* () {
				opens++;
				if (failNext) {
					failNext = false;
					return yield* Effect.die("SDK open failed");
				}
				const scope = yield* Scope.Scope;
				acquisitions.push({
					...options,
					tools: options.tools.map((tool) => ({ ...tool, call: (callId: string, args: unknown) => callWhileOpen(scope, tool, callId, args) })),
				});
				yield* Effect.addFinalizer(() => Deferred.succeed(released, undefined));
				const nativeRef = nativeOverride ?? Option.getOrElse(options.resume, () => "native");
				const announce = Queue.offer(events, { type: "session.opened", nativeRef, raw: { source: "scripted", kind: "test", payload: "opened" } });
				if (!inputOpens) yield* announce;
				return {
					events: Stream.fromQueue(events),
					nativeRef: Effect.succeed(Option.some(nativeRef)),
					interrupt: Effect.void,
					queue: (input) =>
						Effect.gen(function* () {
							if (inputOpens) yield* announce;
							yield* Deferred.succeed(delivering, undefined);
							if (blocked) yield* Deferred.await(releaseDelivery);
							queued.push(input);
						}),
					steer: (input) =>
						Effect.sync(() => {
							steered.push(input);
						}),
				};
			}),
	};
	const dependencies = Layer.mergeAll(
		file({ filename: ":memory:", logId: "log" }),
		Layer.succeed(BackendRegistry, { backends: new Map([["scripted", backend]]) }),
		Layer.succeed(InputResolver, { resolve: (input) => Effect.succeed({ id: input.id, parts: [{ type: "text", text: "resolved input" }] }) }),
		Layer.succeed(RunnerIdentity, { runnerId: "runner" }),
		Layer.succeed(ServerTools, { call: () => Deferred.succeed(forwarded, undefined).pipe(Effect.andThen(Deferred.await(answer))) }),
	);
	return {
		events,
		queued,
		steered,
		auditEvents,
		nodeEvents,
		acquisitions,
		forwarded,
		answer,
		delivering,
		released,
		openOnInput: Effect.sync(() => {
			inputOpens = true;
		}),
		failNextOpen: Effect.sync(() => {
			failNext = true;
		}),
		wrongNative: Effect.sync(() => {
			nativeOverride = "different-native";
		}),
		blockDelivery: Effect.sync(() => {
			blocked = true;
		}),
		opens: () => opens,
		live: layer.pipe(Layer.provideMerge(dependencies)),
	};
});
