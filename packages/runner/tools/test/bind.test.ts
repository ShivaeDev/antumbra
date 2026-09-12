import type { ToolCall } from "@antumbra/platform-runner/tools.ts";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer } from "effect";
import { bind } from "#bind.ts";
import { ToolDispatch } from "#dispatch.ts";

const read = { description: "Read work", inputSchema: { type: "object" }, name: "read_work" };
const write = { description: "Write work", inputSchema: { type: "object" }, name: "write_work" };

it.effect("binds the session and tool name outside the model's input", () =>
	Effect.gen(function* () {
		const calls: ToolCall[] = [];
		const dispatch = Layer.succeed(ToolDispatch)({
			call: (call) =>
				Effect.sync(() => {
					calls.push(call);
					return { ok: true, text: call.name };
				}),
		});
		const crew = yield* bind("crew-session", { tools: [read], version: "v1" }).pipe(Effect.provide(dispatch));
		const captain = yield* bind("captain-session", { tools: [write], version: "v1" }).pipe(Effect.provide(dispatch));
		expect(crew.map((tool) => tool.name)).toEqual([read.name]);
		expect(captain.map((tool) => tool.name)).toEqual([write.name]);
		for (const tool of crew) {
			yield* tool.call("native-read", { sessionId: "captain-session", name: write.name });
		}
		for (const tool of captain) {
			yield* tool.call("native-write", { body: "charter" });
		}
		expect(calls).toEqual([
			{ callId: "native-read", input: { sessionId: "captain-session", name: write.name }, name: read.name, sessionId: "crew-session" },
			{ callId: "native-write", input: { body: "charter" }, name: write.name, sessionId: "captain-session" },
		]);
	}),
);

it.effect("keeps the provider callback pending until dispatch answers", () =>
	Effect.gen(function* () {
		const entered = yield* Deferred.make<void>();
		const answer = yield* Deferred.make<{ readonly ok: boolean; readonly text: string }>();
		const tools = yield* bind("session", { tools: [read], version: "v1" }).pipe(
			Effect.provide(Layer.succeed(ToolDispatch)({ call: () => Deferred.succeed(entered, undefined).pipe(Effect.andThen(Deferred.await(answer))) })),
		);
		for (const tool of tools) {
			const call = yield* Effect.forkChild(tool.call("native-call", {}));
			yield* Deferred.await(entered);
			expect(call.pollUnsafe()).toBeUndefined();
			yield* Deferred.succeed(answer, { ok: false, text: "ruling declined" });
			expect(yield* Fiber.join(call)).toEqual({ ok: false, text: "ruling declined" });
		}
	}),
);
