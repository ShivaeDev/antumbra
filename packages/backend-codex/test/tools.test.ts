import type { DirectTool } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Option, Ref, Scope } from "effect";
import { TestClock } from "effect/testing";
import { makeCodexServer } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";
import { openThreadSession } from "#thread.ts";

const THREAD = "thread-1";

const landReport = (calls: Ref.Ref<ReadonlyArray<unknown>>): DirectTool => ({
	call: (args) => Ref.update(calls, (all) => [...all, args]).pipe(Effect.as({ ok: true, text: "report landed" })),
	description: "Land a report against your piece.",
	inputSchema: {
		additionalProperties: false,
		properties: { title: { type: "string" } },
		required: ["title"],
		type: "object",
	},
	name: "land_report",
});

const waitForRuling = (started: Deferred.Deferred<void>, interrupted: Deferred.Deferred<void>): DirectTool => ({
	call: () =>
		Deferred.succeed(started, undefined).pipe(
			Effect.andThen(Effect.never),
			Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)),
		),
	description: "Wait for a ruling.",
	inputSchema: { properties: {}, type: "object" },
	name: "wait_for_ruling",
});

const toolCall = (id: number, threadId: string, tool: string) => ({
	arguments: {},
	callId: `call-${id}`,
	threadId,
	tool,
	turnId: "turn-1",
});

const openWithTools = (resume: Option.Option<string> = Option.none()) =>
	Effect.gen(function* () {
		const calls = yield* Ref.make<ReadonlyArray<unknown>>([]);
		const fake = makeFakeAppServer();
		const server = yield* makeCodexServer({ spawn: () => fake.process });
		yield* openThreadSession(server, {
			cwd: "/moorage",
			resume,
			sessionId: "session-1",
			tools: [landReport(calls)],
		});
		return { calls, fake };
	});

it.live("a thread starts with the tools its session was opened with", () =>
	Effect.gen(function* () {
		const { fake } = yield* openWithTools();
		expect(fake.requests[1]?.params).toMatchObject({
			dynamicTools: [
				{
					description: "Land a report against your piece.",
					name: "land_report",
					type: "function",
				},
			],
		});
	}),
);

it.live("resume sends no specifications; codex kept them in the rollout", () =>
	Effect.gen(function* () {
		const { fake } = yield* openWithTools(Option.some(THREAD));
		expect(fake.requests[1]?.method).toBe("thread/resume");
		expect(fake.requests[1]?.params).not.toHaveProperty("dynamicTools");
	}),
);

it.live("a tool call runs the tool and answers with its outcome", () =>
	Effect.gen(function* () {
		const { calls, fake } = yield* openWithTools();
		fake.serverRequest(7, "item/tool/call", {
			arguments: { title: "soundings" },
			callId: "call-1",
			threadId: THREAD,
			tool: "land_report",
			turnId: "turn-1",
		});
		expect(yield* fake.responseById(7)).toEqual({
			contentItems: [{ text: "report landed", type: "inputText" }],
			success: true,
		});
		expect(yield* Ref.get(calls)).toEqual([{ title: "soundings" }]);
	}),
);

it.live("a tool we never served answers as failed, not as an unknown method", () =>
	Effect.gen(function* () {
		const { fake } = yield* openWithTools();
		fake.serverRequest(8, "item/tool/call", {
			arguments: {},
			callId: "call-2",
			threadId: THREAD,
			tool: "launch_the_boats",
			turnId: "turn-1",
		});
		expect(yield* fake.responseById(8)).toMatchObject({ success: false });
	}),
);

it.effect("the clock the server reads is ours, in whole seconds", () =>
	Effect.gen(function* () {
		yield* TestClock.setTime(12_345);
		const { fake } = yield* openWithTools();
		fake.serverRequest(9, "currentTime/read", { threadId: THREAD });
		expect(yield* fake.responseById(9)).toEqual({ currentTimeAt: 12 });
	}),
);

it.live("a resumed thread can still answer a call", () =>
	Effect.gen(function* () {
		const { fake } = yield* openWithTools(Option.some(THREAD));
		fake.serverRequest(10, "item/tool/call", {
			arguments: { title: "second sounding" },
			callId: "call-3",
			threadId: THREAD,
			tool: "land_report",
			turnId: "turn-1",
		});
		expect(yield* fake.responseById(10)).toMatchObject({ success: true });
	}),
);

const openBesideWaiter = Effect.gen(function* () {
	const started = yield* Deferred.make<void>();
	const interrupted = yield* Deferred.make<void>();
	const calls = yield* Ref.make<ReadonlyArray<unknown>>([]);
	const fake = makeFakeAppServer();
	const server = yield* makeCodexServer({ spawn: () => fake.process });
	const waiter = yield* Effect.flatMap(Effect.scope, Scope.fork);
	yield* openThreadSession(server, {
		cwd: "/moorage",
		resume: Option.none(),
		sessionId: "session-1",
		tools: [waitForRuling(started, interrupted)],
	}).pipe(Scope.provide(waiter));
	yield* openThreadSession(server, {
		cwd: "/moorage",
		resume: Option.some("thread-2"),
		sessionId: "session-2",
		tools: [landReport(calls)],
	});
	fake.serverRequest(11, "item/tool/call", toolCall(11, THREAD, "wait_for_ruling"));
	yield* Deferred.await(started);
	return { fake, interrupted, waiter };
});

it.live("a call waiting on one thread holds up no other thread's call", () =>
	Effect.gen(function* () {
		const { fake } = yield* openBesideWaiter;
		fake.serverRequest(12, "item/tool/call", toolCall(12, "thread-2", "land_report"));
		expect(yield* fake.responseById(12)).toMatchObject({ success: true });
	}),
);

it.live("closing the waiting session interrupts its call and answers it", () =>
	Effect.gen(function* () {
		const { fake, interrupted, waiter } = yield* openBesideWaiter;
		yield* Scope.close(waiter, Exit.void);
		yield* Deferred.await(interrupted);
		expect(yield* fake.responseById(11)).toMatchObject({ success: false });
	}),
);
