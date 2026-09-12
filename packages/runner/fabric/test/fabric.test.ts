import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Fiber, Option, Queue, Stream } from "effect";
import { RunnerFabric } from "#fabric.ts";
import { RunnerLog } from "#log.ts";
import { fixture, start } from "#test/fixture.ts";

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

it.effect("keeps repeated native audit findings on one event path", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		const event: AgentEvent = { type: "raw", raw: { source: "scripted", kind: "audit", payload: "finding" } };
		test.auditEvents.push(event, event, { type: "thinking", text: "distinct semantic event", raw: event.raw });
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			const log = yield* RunnerLog;
			yield* fabric.execute({
				type: "Wake",
				requestId: "wake",
				sessionId: "session",
				options: start.options,
				nativeRef: "existing-native",
				instruction: { id: "wake-input", parts: [{ type: "text", text: "continue" }] },
			});
			expect((yield* log.read(-1)).filter(({ event }) => event.type === "ProviderEvent" && event.event.raw.payload === "finding")).toHaveLength(2);
		}).pipe(Effect.provide(test.live));
	}),
);
