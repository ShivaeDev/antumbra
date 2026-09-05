import type { SessionHandle } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Exit, Fiber, Option, Queue, Scope, Stream } from "effect";
import { makeCodexServer } from "#server.ts";
import { type FakeAppServer, makeFakeAppServer } from "#test/fake.ts";
import { textInput } from "#test/input.ts";
import { openThreadSession } from "#thread.ts";

const THREAD = "thread-1";

const openFake = (resume: Option.Option<string> = Option.none(), fake = makeFakeAppServer()) =>
	Effect.gen(function* () {
		const server = yield* makeCodexServer({ spawn: () => fake.process });
		const handle = yield* openThreadSession(server, {
			cwd: "/moorage",
			effort: Option.none(),
			model: Option.none(),
			resume,
			sessionId: "session-1",
			tools: [],
		});
		const events = yield* Queue.unbounded<AgentEvent>();
		yield* handle.events.pipe(
			Stream.runForEach((event) => Queue.offer(events, event)),
			Effect.forkScoped,
		);
		return { events, fake, handle };
	});

const methods = (fake: FakeAppServer) => fake.requests.map((r) => r.method);

const turnStarted = (fake: FakeAppServer, id: string) =>
	fake.notify("turn/started", {
		threadId: THREAD,
		turn: { id, items: [], status: "inProgress" },
	});

const turnCompleted = (fake: FakeAppServer, id: string, status = "completed") =>
	fake.notify("turn/completed", {
		threadId: THREAD,
		turn: { durationMs: 12, id, items: [], status },
	});

it.live("the handshake runs, a thread opens, and session.opened names it", () =>
	Effect.gen(function* () {
		const { events, fake, handle } = yield* openFake();
		expect(methods(fake)).toEqual(["initialize", "thread/start"]);
		expect(fake.requests[1]?.params).toEqual({
			approvalsReviewer: "auto_review",
			cwd: "/moorage",
			sandbox: "workspace-write",
		});
		expect(yield* handle.nativeRef).toEqual(Option.some(THREAD));
		const opened = yield* Queue.take(events);
		expect(opened?.type).toBe("session.opened");
		expect(opened?.type === "session.opened" && opened.nativeRef).toBe(THREAD);
	}),
);

it.live("resume hands the native ref back as threadId", () =>
	Effect.gen(function* () {
		const { fake } = yield* openFake(Option.some("thread-old"));
		expect(fake.requests[1]?.method).toBe("thread/resume");
		expect(fake.requests[1]?.params).toMatchObject({ threadId: "thread-old" });
	}),
);

it.live("only this thread's notifications become events; items map", () =>
	Effect.gen(function* () {
		const { events, fake } = yield* openFake();
		yield* Queue.take(events);
		fake.notify("item/completed", {
			item: { id: "msg", text: "pong", type: "agentMessage" },
			threadId: "someone-else",
			turnId: "t",
		});
		fake.notify("item/completed", {
			item: { id: "msg", text: "pong", type: "agentMessage" },
			threadId: THREAD,
			turnId: "t",
		});
		const message = yield* Queue.take(events);
		expect(message).toMatchObject({
			role: "agent",
			text: "pong",
			type: "message",
		});
	}),
);

it.live("account rate limits reach the session without a thread id", () =>
	Effect.gen(function* () {
		const { events, fake } = yield* openFake();
		yield* Queue.take(events);
		fake.notify("account/rateLimits/updated", {
			rateLimits: {
				primary: {
					resetsAt: 1787180346,
					usedPercent: 42,
					windowDurationMins: 300,
				},
			},
		});
		expect(yield* Queue.take(events)).toMatchObject({
			raw: { kind: "account/rateLimits/updated", source: "codex" },
			status: "unknown",
			type: "rate.limit",
			windows: [{ durationMinutes: 300, usedPercent: 42 }],
		});
	}),
);

it.live("queue settles only when its text reaches a provider turn", () =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer({ hold: "turn/start" });
		const { handle } = yield* openFake(Option.none(), fake);
		const first = yield* Effect.forkChild(handle.queue(textInput("first")));
		const firstRequest = yield* fake.takeHeldRequest;
		firstRequest.accept();
		yield* Fiber.join(first);
		const second = yield* Effect.forkScoped(handle.queue(textInput("second")));
		turnCompleted(fake, "turn-1");
		const secondRequest = yield* fake.takeHeldRequest;
		expect(secondRequest.params).toEqual({
			clientUserMessageId: "00000000-0000-4000-8000-000000000001",
			input: [{ text: "second", text_elements: [], type: "text" }],
			threadId: THREAD,
		});
		secondRequest.accept();
		yield* Fiber.join(second);
	}),
);

it.live("queued words are said once, where codex reports taking them", () =>
	Effect.gen(function* () {
		const { events, fake, handle } = yield* openFake();
		yield* Queue.take(events);
		yield* handle.queue(textInput("sound the reef"));
		expect(yield* Queue.size(events)).toBe(0);
		fake.notify("item/completed", {
			item: {
				content: [{ text: "sound the reef", text_elements: [], type: "text" }],
				id: "u1",
				type: "userMessage",
			},
			threadId: THREAD,
			turnId: "turn-1",
		});
		turnCompleted(fake, "turn-1");
		expect([yield* Queue.take(events), yield* Queue.take(events)]).toMatchObject([
			{ role: "user", text: "sound the reef", type: "message" },
			{ type: "turn.completed" },
		]);
	}),
);

it.live("closing a session fails text held before provider acceptance", () =>
	Effect.gen(function* () {
		const scope = yield* Scope.make();
		const fake = makeFakeAppServer({ hold: "turn/start" });
		const server = yield* makeCodexServer({ spawn: () => fake.process });
		const handle = yield* openThreadSession(server, {
			cwd: "/moorage",
			effort: Option.none(),
			model: Option.none(),
			resume: Option.none(),
			sessionId: "session-cut",
			tools: [],
		}).pipe(Scope.provide(scope));
		const first = yield* Effect.forkChild(handle.queue(textInput("first")));
		(yield* fake.takeHeldRequest).accept();
		yield* Fiber.join(first);
		const held = yield* Effect.forkChild(handle.queue(textInput("held")));
		turnCompleted(fake, "turn-1");
		yield* fake.takeHeldRequest;
		yield* Scope.close(scope, Exit.void);
		expect(yield* Effect.flip(Fiber.join(held))).toMatchObject({
			detail: "session closed before delivery reached the provider",
			tag: "codex",
		});
	}),
);

it.live("provider termination fails text held before acceptance", () =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer({ hold: "turn/start" });
		const { handle } = yield* openFake(Option.none(), fake);
		const first = yield* Effect.forkChild(handle.queue(textInput("first")));
		(yield* fake.takeHeldRequest).accept();
		yield* Fiber.join(first);
		const held = yield* Effect.forkChild(handle.queue(textInput("held")));
		turnCompleted(fake, "turn-1");
		yield* fake.takeHeldRequest;
		fake.exit();
		expect(yield* Effect.flip(Fiber.join(held))).toMatchObject({
			detail: "session closed before delivery reached the provider",
			tag: "codex",
		});
	}),
);

it.live("steer rides the active turn and starts one when idle", () =>
	Effect.gen(function* () {
		const { fake, handle } = yield* openFake();
		yield* handle.steer(textInput("go left"));
		expect(fake.requests.at(-1)?.method).toBe("turn/start");
		yield* handle.steer(textInput("no, right"));
		const steer = fake.requests.at(-1);
		expect(steer?.method).toBe("turn/steer");
		expect(steer?.params).toMatchObject({
			expectedTurnId: "turn-1",
			threadId: THREAD,
		});
	}),
);

it.live("interrupt targets the active turn and is a no-op when idle", () =>
	Effect.gen(function* () {
		const { fake, handle } = yield* openFake();
		yield* handle.interrupt;
		expect(methods(fake)).not.toContain("turn/interrupt");
		yield* handle.queue(textInput("work"));
		turnStarted(fake, "turn-1");
		yield* handle.interrupt;
		expect(fake.requests.at(-1)).toMatchObject({
			method: "turn/interrupt",
			params: { threadId: THREAD, turnId: "turn-1" },
		});
	}),
);

it.live("a residual approval is declined and lands in the log as raw", () =>
	Effect.gen(function* () {
		const { events, fake } = yield* openFake();
		yield* Queue.take(events);
		fake.serverRequest(0, "item/commandExecution/requestApproval", {
			command: "rm -rf /",
			itemId: "call-1",
			threadId: THREAD,
			turnId: "turn-1",
		});
		expect(yield* fake.responseById(0)).toEqual({ decision: "decline" });
		const asked = yield* Queue.take(events);
		expect(asked?.type).toBe("raw");
		expect(asked?.raw.kind).toBe("item/commandExecution/requestApproval");
	}),
);

it.live("turn.completed carries the codex status; the child dying ends the stream", () =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer();
		const server = yield* makeCodexServer({ spawn: () => fake.process });
		const handle: SessionHandle = yield* openThreadSession(server, {
			cwd: "/moorage",
			effort: Option.none(),
			model: Option.none(),
			resume: Option.none(),
			sessionId: "session-1",
			tools: [],
		});
		const turnRecorded = yield* Deferred.make<void>();
		const collector = yield* handle.events.pipe(
			Stream.tap((event) => (event.type === "turn.completed" ? Deferred.succeed(turnRecorded, undefined) : Effect.void)),
			Stream.runCollect,
			Effect.forkScoped,
		);
		turnCompleted(fake, "turn-1", "interrupted");
		yield* Deferred.await(turnRecorded);
		fake.exit();
		const events = yield* Fiber.join(collector);
		expect(events.map((event) => event.type)).toEqual(["session.opened", "turn.completed", "session.state"]);
		expect(events[1]).toMatchObject({
			durationMs: 12,
			status: "interrupted",
		});
	}),
);
