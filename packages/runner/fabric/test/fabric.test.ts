import type { Operation } from "@antumbra/platform-runner/operations.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { AgentBackend, OpenSessionOptions, SessionInput } from "@antumbra/runner-ports/backend.ts";
import { noSessionAudit } from "@antumbra/runner-ports/session-audit.ts";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Fiber, Layer, Option, Queue, Stream } from "effect";
import { layer, RunnerFabric } from "#fabric.ts";
import { file, RunnerLog } from "#log.ts";
import { BackendRegistry, InputResolver, RunnerIdentity, ServerTools } from "#ports.ts";

const start: Extract<Operation, { type: "Start" }> = {
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

const fixture = Effect.gen(function* () {
	const events = yield* Queue.unbounded<AgentEvent>();
	const queued: SessionInput[] = [];
	const delivering = yield* Deferred.make<void>();
	const releaseDelivery = yield* Deferred.make<void>();
	let blocked = false;
	const steered: SessionInput[] = [];
	const acquisitions: OpenSessionOptions[] = [];
	const forwarded = yield* Deferred.make<void>();
	const answer = yield* Deferred.make<{ ok: boolean; text: string }>();
	let opens = 0;
	const backend: AgentBackend = {
		tag: "scripted",
		audit: noSessionAudit,
		capabilities: { imageInput: true },
		listModels: Effect.succeed([]),
		openSession: (options) =>
			Effect.gen(function* () {
				opens++;
				acquisitions.push(options);
				yield* Queue.offer(events, { type: "session.opened", nativeRef: "native", raw: { source: "scripted", kind: "test", payload: "opened" } });
				return {
					events: Stream.fromQueue(events),
					nativeRef: Effect.succeed(Option.some("native")),
					interrupt: Effect.void,
					queue: (input) =>
						Effect.gen(function* () {
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
		acquisitions,
		forwarded,
		answer,
		delivering,
		blockDelivery: Effect.sync(() => {
			blocked = true;
		}),
		opens: () => opens,
		live: layer.pipe(Layer.provideMerge(dependencies)),
	};
});

it.effect("logs native start and charter acceptance before answering and reuses the request", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			const log = yield* RunnerLog;
			expect(yield* fabric.execute(start)).toEqual({ type: "Accepted" });
			expect(yield* fabric.execute(start)).toEqual({ type: "Accepted" });
			expect(test.opens()).toBe(1);
			expect(test.queued).toHaveLength(1);
			expect((yield* log.request("start")).map(({ event }) => event.type)).toEqual(["SessionStarted", "InputAccepted"]);
			yield* fabric.execute({
				type: "Deliver",
				requestId: "send",
				sessionId: "session",
				act: "steer",
				input: { id: "send-input", parts: [{ type: "text", text: "hello" }] },
			});
			expect(test.steered).toHaveLength(1);
		}).pipe(Effect.provide(test.live));
	}),
);

it.effect("sleep refuses working roots and ordinary quit cuts them without ending identity", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			const log = yield* RunnerLog;
			yield* fabric.execute(start);
			expect((yield* fabric.execute({ type: "Sleep", requestId: "sleep", sessionId: "session" })).type).toBe("Refused");
			yield* fabric.execute({ type: "Drain", requestId: "quit" });
			expect(yield* fabric.attached()).toEqual(new Set());
			expect((yield* log.request("quit")).map(({ event }) => event.type)).toEqual(["SessionSlept"]);
		}).pipe(Effect.provide(test.live));
	}),
);

it.effect("sleep becomes available after observed work settles", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			const log = yield* RunnerLog;
			yield* fabric.execute(start);
			const observed = yield* Deferred.make<void>();
			yield* log.events(-1).pipe(
				Stream.filter(({ event }) => event.type === "ProviderEvent" && event.event.type === "turn.completed"),
				Stream.take(1),
				Stream.runDrain,
				Effect.andThen(Deferred.succeed(observed, undefined)),
				Effect.forkScoped,
			);
			yield* Queue.offer(test.events, { type: "turn.completed", status: "completed", raw: { source: "scripted", kind: "test", payload: "done" } });
			yield* Deferred.await(observed);
			expect(yield* fabric.execute({ type: "Sleep", requestId: "sleep", sessionId: "session" })).toEqual({ type: "Accepted" });
		}).pipe(Effect.provide(test.live));
	}),
);

it.effect("keeps tools pending with stable identity and returns recorded answers on replay", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			const log = yield* RunnerLog;
			yield* fabric.execute({
				...start,
				options: { ...start.options, toolSet: { version: "1", tools: [{ name: "act", description: "Act", inputSchema: { type: "object" } }] } },
			});
			const tool = test.acquisitions[0]?.tools[0];
			if (tool === undefined) return yield* Effect.die("bound tool missing");
			const calling = yield* tool.call("call", {}).pipe(Effect.forkScoped);
			yield* Deferred.await(test.forwarded);
			expect((yield* log.tool("session", "call")).map(({ event }) => event.type)).toEqual(["ToolCalled"]);
			yield* Deferred.succeed(test.answer, { ok: true, text: "done" });
			expect(yield* Fiber.join(calling)).toEqual({ ok: true, text: "done" });
			expect(yield* tool.call("call", {})).toEqual({ ok: true, text: "done" });
			expect((yield* log.tool("session", "call")).map(({ event }) => event.type)).toEqual(["ToolCalled", "ToolAnswered"]);
		}).pipe(Effect.provide(test.live));
	}),
);

it.effect("opens nothing at boot and resumes the same native identity only when asked", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			expect(test.opens()).toBe(0);
			yield* fabric.execute({
				type: "Wake",
				requestId: "wake",
				sessionId: "session",
				options: start.options,
				nativeRef: "existing-native",
				instruction: { id: "wake-input", parts: [{ type: "text", text: "continue" }] },
			});
			expect(test.acquisitions[0]?.resume).toEqual(Option.some("existing-native"));
			expect(test.acquisitions[0]?.sessionId).toBe("session");
			expect(test.queued.map((input) => input.id)).toEqual(["wake-input"]);
		}).pipe(Effect.provide(test.live));
	}),
);

it.effect("an explicit stop cuts an outstanding charter delivery", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			const log = yield* RunnerLog;
			yield* test.blockDelivery;
			const starting = yield* fabric.execute(start).pipe(Effect.forkScoped);
			yield* Deferred.await(test.delivering);
			yield* fabric.execute({ type: "Stop", requestId: "stop", sessionId: "session", reason: "stopped" });
			expect(Exit.isFailure(yield* Fiber.await(starting))).toBe(true);
			expect(test.queued).toEqual([]);
			expect((yield* log.request("start")).map(({ event }) => event.type)).toEqual(["SessionStarted", "InputAmbiguous"]);
		}).pipe(Effect.provide(test.live));
	}),
);
