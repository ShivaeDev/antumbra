import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Queue, Stream } from "effect";
import { makeCodexServer } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";
import { imageInput } from "#test/input.ts";
import { openThreadSession } from "#thread.ts";

it.live("an ordered local image reaches codex and its echo keeps the input id", () =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer();
		const server = yield* makeCodexServer({ spawn: () => fake.process });
		const handle = yield* openThreadSession(server, {
			cwd: "/moorage",
			resume: Option.none(),
			sessionId: "session-1",
			tools: [],
		});
		const events = yield* Queue.unbounded<AgentEvent>();
		yield* handle.events.pipe(
			Stream.runForEach((event) => Queue.offer(events, event)),
			Effect.forkScoped,
		);
		yield* Queue.take(events);
		yield* handle.queue(imageInput());
		expect(fake.requests.at(-1)?.params).toEqual({
			clientUserMessageId: "00000000-0000-4000-8000-000000000001",
			input: [
				{ path: "/custody/reef.png", type: "localImage" },
				{ text: "what is shown?", text_elements: [], type: "text" },
			],
			threadId: "thread-1",
		});
		fake.notify("item/completed", {
			item: {
				clientId: "00000000-0000-4000-8000-000000000001",
				content: [
					{ path: "/custody/reef.png", type: "localImage" },
					{ text: "what is shown?", type: "text" },
				],
				id: "u-image",
				type: "userMessage",
			},
			threadId: "thread-1",
			turnId: "turn-1",
		});
		expect(yield* Queue.take(events)).toMatchObject({
			inputId: "00000000-0000-4000-8000-000000000001",
			parts: [
				{ position: 0, type: "image" },
				{ text: "what is shown?", type: "text" },
			],
			role: "user",
			type: "message",
		});
	}),
);
