import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Fiber, Queue } from "effect";
import { RunnerFabric } from "#fabric.ts";
import { RunnerLog } from "#log.ts";
import { fixture, start } from "#test/fixture.ts";

it.effect("queues the first input when it is needed to announce native identity", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		yield* test.openOnInput;
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			const log = yield* RunnerLog;
			expect(yield* fabric.execute(start)).toEqual({ type: "Accepted" });
			expect((yield* log.request("start")).map(({ event }) => event.type)).toEqual(["SessionStarted", "InputAccepted"]);
		}).pipe(Effect.provide(test.live));
	}),
);

it.effect("refuses a wake that returns a different native conversation", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		yield* test.wrongNative;
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			const log = yield* RunnerLog;
			yield* Effect.exit(
				fabric.execute({
					type: "Wake",
					requestId: "wake",
					sessionId: "session",
					options: start.options,
					nativeRef: "expected",
					instruction: { id: "instruction", parts: [{ type: "text", text: "resume" }] },
				}),
			);
			const events = (yield* log.request("wake")).map(({ event }) => event.type);
			expect(events).toContain("SessionFailed");
			expect(events).not.toContain("SessionWoke");
		}).pipe(Effect.provide(test.live));
	}),
);

it.effect("releases the failed acquisition when the SDK open defects", () =>
	Effect.gen(function* () {
		const test = yield* fixture;
		yield* test.failNextOpen;
		yield* Effect.gen(function* () {
			const fabric = yield* RunnerFabric;
			expect(Exit.isFailure(yield* Effect.exit(fabric.execute(start)))).toBe(true);
			expect(yield* fabric.attached()).toEqual(new Set());
			expect(yield* fabric.execute({ ...start, requestId: "retry" })).toEqual({ type: "Accepted" });
			expect(test.opens()).toBe(2);
		}).pipe(Effect.provide(test.live));
	}),
);

it.effect("stream EOF releases provider resources and pending callbacks", () =>
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
			const pending = yield* tool.call("call", {}).pipe(Effect.forkScoped);
			yield* Deferred.await(test.forwarded);
			yield* Queue.end(test.events);
			yield* Deferred.await(test.released);
			expect(yield* Fiber.join(pending)).toEqual({ ok: false, text: "the session that served this tool closed before the call finished" });
			expect(yield* fabric.attached()).toEqual(new Set());
			expect((yield* log.tool("session", "call")).map(({ event }) => event.type)).toEqual(["ToolCalled"]);
		}).pipe(Effect.provide(test.live));
	}),
);
