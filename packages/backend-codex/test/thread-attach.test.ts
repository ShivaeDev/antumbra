import { BackendFailure } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { makeCodexServer } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";
import { textInput } from "#test/input.ts";
import { openThreadSession } from "#thread.ts";

const ROOT = "thread-1";
const CHILD = "thread-child";

const options = (resume: Option.Option<string>) => ({
	cwd: "/moorage",
	effort: Option.none(),
	model: Option.none(),
	resume,
	sessionId: "session-1",
	tools: [],
});

it.live("a subsession's thread is refused at the attachment seam", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeAppServer();
			const server = yield* makeCodexServer({ skills: "/antumbra/skills", spawn: () => fake.process });
			server.threads.claim(ROOT, CHILD);
			const refused = yield* Effect.flip(Effect.scoped(openThreadSession(server, options(Option.some(CHILD)))));
			expect(refused).toBeInstanceOf(BackendFailure);
			expect(refused.detail).toContain("subsession");
			expect(fake.requests.map((request) => request.method)).toEqual(["initialize", "skills/extraRoots/set"]);

			const handle = yield* openThreadSession(server, options(Option.some(ROOT)));
			expect(yield* handle.nativeRef).toEqual(Option.some(ROOT));
			expect(fake.requests.map((request) => request.method)).toEqual(["initialize", "skills/extraRoots/set", "thread/resume"]);
		}),
	),
);

it.live("a woken thread carries the words that woke it into its first turn", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeAppServer();
			const server = yield* makeCodexServer({ skills: "/antumbra/skills", spawn: () => fake.process });
			const handle = yield* openThreadSession(server, options(Option.some(ROOT)));
			yield* handle.queue(textInput("come about"));
			expect(fake.requests.map((request) => request.method)).toEqual(["initialize", "skills/extraRoots/set", "thread/resume", "turn/start"]);
			expect(fake.requests.at(-1)?.params).toEqual({
				clientUserMessageId: "00000000-0000-4000-8000-000000000001",
				input: [{ text: "come about", text_elements: [], type: "text" }],
				threadId: ROOT,
			});
		}),
	),
);
