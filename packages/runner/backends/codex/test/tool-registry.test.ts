import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { dynamicToolAnswer } from "#tool-calls.ts";
import { makeToolRegistry } from "#tool-registry.ts";

it.effect("a native tool call keeps its identity and waits until the runner answers", () =>
	Effect.gen(function* () {
		const tools = yield* makeToolRegistry;
		const started = yield* Deferred.make<{ callId: string; args: unknown }>();
		const answer = yield* Deferred.make<{ ok: boolean; text: string }>();
		yield* tools.register("thread-1", [
			{
				call: (callId, args) => Deferred.succeed(started, { callId, args }).pipe(Effect.andThen(Deferred.await(answer))),
				description: "Read a report.",
				inputSchema: { type: "object" },
				name: "read_report",
			},
		]);
		const pending = yield* dynamicToolAnswer(tools, {
			threadId: "thread-1",
			callId: "native-call-7",
			tool: "read_report",
			arguments: { title: "soundings" },
		}).pipe(Effect.forkScoped);
		expect(yield* Deferred.await(started)).toEqual({ callId: "native-call-7", args: { title: "soundings" } });
		yield* TestClock.adjust("1 day");
		expect(pending.pollUnsafe()).toBeUndefined();
		yield* Deferred.succeed(answer, { ok: true, text: "the report" });
		expect(yield* Fiber.join(pending)).toEqual({ contentItems: [{ type: "inputText", text: "the report" }], success: true });
	}),
);
