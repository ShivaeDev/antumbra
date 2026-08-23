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
	resume,
	sessionId: "session-1",
	tools: [],
});

// why: attaching to a sub-agent's thread mutates it, so the refusal has to be
// structural — the id never reaches the wire, whatever the caller believed it
// held.
it.live("a subsession's thread is refused at the attachment seam", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeAppServer();
			const server = yield* makeCodexServer({ spawn: () => fake.process });
			server.threads.claim(ROOT, CHILD);
			const refused = yield* Effect.flip(
				Effect.scoped(openThreadSession(server, options(Option.some(CHILD)))),
			);
			expect(refused).toBeInstanceOf(BackendFailure);
			expect(refused.detail).toContain("subsession");
			expect(fake.requests.map((request) => request.method)).toEqual([
				"initialize",
			]);

			// why: the same seam takes a root without complaint — the refusal is
			// about what the id is, never about resuming at all.
			const handle = yield* openThreadSession(
				server,
				options(Option.some(ROOT)),
			);
			expect(yield* handle.nativeRef).toEqual(Option.some(ROOT));
			expect(fake.requests.map((request) => request.method)).toEqual([
				"initialize",
				"thread/resume",
			]);
		}),
	),
);

// why: waking a sleeping session is one act, not two — the conversation it
// already has is re-entered and the words that woke it are said in it. A
// `thread/start` here would strand the whole prior log, and words that never
// reach a turn were never said to anyone.
it.live(
	"a woken thread carries the words that woke it into its first turn",
	() =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakeAppServer();
				const server = yield* makeCodexServer({ spawn: () => fake.process });
				const handle = yield* openThreadSession(
					server,
					options(Option.some(ROOT)),
				);
				yield* handle.queue(textInput("come about"));
				expect(fake.requests.map((request) => request.method)).toEqual([
					"initialize",
					"thread/resume",
					"turn/start",
				]);
				expect(fake.requests.at(-1)?.params).toEqual({
					clientUserMessageId: "00000000-0000-4000-8000-000000000001",
					input: [{ text: "come about", text_elements: [], type: "text" }],
					threadId: ROOT,
				});
			}),
		),
);
