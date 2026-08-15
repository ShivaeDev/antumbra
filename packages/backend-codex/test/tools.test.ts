import type { DirectTool } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref, Schedule } from "effect";
import { makeCodexServer } from "#server.ts";
import { type FakeAppServer, makeFakeAppServer } from "#test/fake.ts";
import { openThreadSession } from "#thread.ts";

const THREAD = "thread-1";

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(5).pipe(Schedule.upTo({ duration: 2000 }))),
	);

const landReport = (calls: Ref.Ref<ReadonlyArray<unknown>>): DirectTool => ({
	call: (args) =>
		Ref.update(calls, (all) => [...all, args]).pipe(
			Effect.as({ ok: true, text: "report landed" }),
		),
	description: "Land a report against your piece.",
	inputSchema: {
		additionalProperties: false,
		properties: { title: { type: "string" } },
		required: ["title"],
		type: "object",
	},
	name: "land_report",
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

const replied = (fake: FakeAppServer, id: number) =>
	eventually(
		Effect.sync(() => {
			const reply = fake.responses.find((response) => response.id === id);
			expect(reply, `no reply to ${id}`).toBeDefined();
			return reply?.result;
		}),
	);

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
		expect(yield* replied(fake, 7)).toEqual({
			contentItems: [{ text: "report landed", type: "inputText" }],
			success: true,
		});
		expect(yield* Ref.get(calls)).toEqual([{ title: "soundings" }]);
	}),
);

it.live(
	"a tool we never served answers as failed, not as an unknown method",
	() =>
		Effect.gen(function* () {
			const { fake } = yield* openWithTools();
			fake.serverRequest(8, "item/tool/call", {
				arguments: {},
				callId: "call-2",
				threadId: THREAD,
				tool: "launch_the_boats",
				turnId: "turn-1",
			});
			expect(yield* replied(fake, 8)).toMatchObject({ success: false });
		}),
);

it.live("the clock the server reads is ours, in whole seconds", () =>
	Effect.gen(function* () {
		const { fake } = yield* openWithTools();
		fake.serverRequest(9, "currentTime/read", { threadId: THREAD });
		const answer = yield* replied(fake, 9);
		expect(answer).toMatchObject({ currentTimeAt: expect.any(Number) });
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
		expect(yield* replied(fake, 10)).toMatchObject({ success: true });
	}),
);
