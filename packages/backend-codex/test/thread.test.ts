import type { SessionHandle } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Option, Queue, Schedule, Stream } from "effect";
import { makeCodexServer } from "#server.ts";
import { type FakeAppServer, makeFakeAppServer } from "#test/fake.ts";
import { openThreadSession } from "#thread.ts";

const THREAD = "thread-1";

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(5).pipe(Schedule.upTo({ duration: 2000 }))),
	);

const openFake = (resume: Option.Option<string> = Option.none()) =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer();
		const server = yield* makeCodexServer({ spawn: () => fake.process });
		const handle = yield* openThreadSession(server, {
			cwd: "/moorage",
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

const seen = (events: Queue.Queue<AgentEvent>, count: number) =>
	eventually(
		Queue.size(events).pipe(
			Effect.flatMap((size) =>
				size >= count ? Queue.takeAll(events) : Effect.fail("not yet"),
			),
		),
	);

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
		const [opened] = yield* seen(events, 1);
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
		yield* seen(events, 1);
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
		const [message] = yield* seen(events, 1);
		expect(message).toMatchObject({
			role: "agent",
			text: "pong",
			type: "message",
		});
	}),
);

it.live(
	"queue starts a turn when idle and holds texts while one is active",
	() =>
		Effect.gen(function* () {
			const { fake, handle } = yield* openFake();
			yield* handle.queue("first");
			expect(methods(fake).at(-1)).toBe("turn/start");
			yield* handle.queue("second");
			yield* handle.queue("third");
			expect(methods(fake).filter((m) => m === "turn/start")).toHaveLength(1);
			turnCompleted(fake, "turn-1");
			yield* eventually(
				Effect.sync(() => {
					expect(methods(fake).filter((m) => m === "turn/start")).toHaveLength(
						2,
					);
				}),
			);
			expect(fake.requests.at(-1)?.params).toEqual({
				input: [
					{ text: "second", text_elements: [], type: "text" },
					{ text: "third", text_elements: [], type: "text" },
				],
				threadId: THREAD,
			});
		}),
);

it.live("steer rides the active turn and starts one when idle", () =>
	Effect.gen(function* () {
		const { fake, handle } = yield* openFake();
		yield* handle.steer("go left");
		expect(fake.requests.at(-1)?.method).toBe("turn/start");
		yield* handle.steer("no, right");
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
		yield* handle.queue("work");
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
		yield* seen(events, 1);
		fake.serverRequest(0, "item/commandExecution/requestApproval", {
			command: "rm -rf /",
			itemId: "call-1",
			threadId: THREAD,
			turnId: "turn-1",
		});
		yield* eventually(
			Effect.sync(() => {
				expect(fake.responses).toEqual([
					{ id: 0, result: { decision: "decline" } },
				]);
			}),
		);
		const [asked] = yield* seen(events, 1);
		expect(asked?.type).toBe("raw");
		expect(asked?.raw.kind).toBe("item/commandExecution/requestApproval");
	}),
);

it.live(
	"turn.completed carries the codex status; the child dying ends the stream",
	() =>
		Effect.gen(function* () {
			const fake = makeFakeAppServer();
			const server = yield* makeCodexServer({ spawn: () => fake.process });
			const handle: SessionHandle = yield* openThreadSession(server, {
				cwd: "/moorage",
				resume: Option.none(),
				sessionId: "session-1",
				tools: [],
			});
			const collector = yield* handle.events.pipe(
				Stream.runCollect,
				Effect.forkScoped,
			);
			turnCompleted(fake, "turn-1", "interrupted");
			yield* Effect.sleep(20);
			fake.exit();
			const events = yield* Fiber.join(collector);
			expect(events.map((event) => event.type)).toEqual([
				"session.opened",
				"turn.completed",
			]);
			expect(events[1]).toMatchObject({
				durationMs: 12,
				status: "interrupted",
			});
		}),
);
