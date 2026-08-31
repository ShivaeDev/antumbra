import type { OpenSessionOptions, SessionHandle } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Option, Stream } from "effect";
import { makeOpencodeServer } from "#server.ts";
import { openOpencodeSession } from "#session.ts";
import { type FakeOpencode, makeFakeOpencode } from "#test/fake.ts";
import { part, SESSION, spoke, status, textPart } from "#test/frames.ts";

const PROMPT = `/session/${SESSION}/prompt_async`;

const options = (resume: Option.Option<string> = Option.none()): OpenSessionOptions => ({
	cwd: "/moorage",
	resume,
	sessionId: "antumbra-session",
	tools: [],
});

const words = (text: string) => ({
	parts: [{ text, type: "text" }] as const,
});

const opened = (fake: FakeOpencode, resume?: string) =>
	makeOpencodeServer(fake.connect).pipe(
		Effect.flatMap((server) => openOpencodeSession(server, options(resume === undefined ? Option.none() : Option.some(resume)))),
	);

it.effect("opens a session and reports the id opencode minted for it", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeOpencode();
			const handle = yield* opened(fake);
			expect(yield* handle.nativeRef).toEqual(Option.some(SESSION));
			expect(fake.calls.map((call) => call.path)).toEqual(["/session"]);
			expect(fake.calls[0]?.query).toEqual({ directory: "/moorage" });
		}),
	),
);

it.effect("resumes by reading the session rather than creating another", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeOpencode();
			const handle = yield* opened(fake, SESSION);
			expect(fake.calls.map((call) => call.path)).toEqual([`/session/${SESSION}`]);
			expect(yield* handle.nativeRef).toEqual(Option.some(SESSION));
		}),
	),
);

const firstMessage = (handle: SessionHandle) =>
	handle.events.pipe(
		Stream.filter((event) => event.type === "message"),
		Stream.runHead,
	);

it.effect("streams what the session said onto the neutral log", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeOpencode();
			const handle = yield* opened(fake);
			const listening = yield* Effect.forkChild(firstMessage(handle));
			fake.emit(spoke("msg_a", "assistant"));
			fake.emit(part(textPart("msg_a", "all done", true)));
			const message = yield* Fiber.join(listening);
			expect(Option.map(message, (event) => (event.type === "message" ? event.text : ""))).toEqual(Option.some("all done"));
		}),
	),
);

const spoken = (fake: FakeOpencode) =>
	fake.calls.flatMap((call) => (call.path === PROMPT && typeof call.body === "object" && call.body !== null ? [JSON.stringify(call.body)] : []));

it.effect("sends a prompt straight away when the session is not working", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeOpencode();
			const handle = yield* opened(fake);
			yield* handle.queue(words("go on then"));
			expect(spoken(fake)).toEqual([JSON.stringify({ parts: [{ text: "go on then", type: "text" }] })]);
		}),
	),
);

it.effect("fails a prompt still waiting when the server goes away", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeOpencode();
			const handle = yield* opened(fake);
			fake.emit(status("busy"));
			const queued = yield* Effect.forkChild(handle.queue(words("never sent")));
			fake.exit();
			const outcome = yield* Effect.exit(Fiber.join(queued));
			expect(outcome._tag).toBe("Failure");
		}),
	),
);

const SCREENSHOT = {
	parts: [
		{
			attachmentId: "att",
			mediaType: "image/png",
			path: "/tmp/shot.png",
			position: 0,
			type: "image",
		},
	],
} as const;

it.effect("refuses an image, which this backend has never proved it can send", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const fake = makeFakeOpencode();
			const handle = yield* opened(fake);
			const outcome = yield* Effect.exit(handle.queue(SCREENSHOT));
			expect(outcome._tag).toBe("Failure");
		}),
	),
);
