import type { OpenSessionOptions, SessionHandle } from "@antumbra/plugin-api";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Fiber, Option, Stream } from "effect";
import { openPiSession } from "#session.ts";
import { said } from "#test/events.ts";
import { type FakePi, makeFakePi, SESSION_FILE } from "#test/fake.ts";

const options = (overrides: Partial<OpenSessionOptions> = {}): OpenSessionOptions => ({
	cwd: "/moorage",
	effort: Option.none(),
	model: Option.none(),
	resume: Option.none(),
	sessionId: "antumbra-session",
	tools: [],
	...overrides,
});

const words = (text: string) => ({ parts: [{ text, type: "text" }] as const });

const opened = (fake: FakePi, overrides: Partial<OpenSessionOptions> = {}) => openPiSession(fake.runtime, options(overrides));

const firstMessage = (handle: SessionHandle) =>
	handle.events.pipe(
		Stream.filter((event) => event.type === "message"),
		Stream.runHead,
	);

describe("a pi session", () => {
	it.effect("reports the file pi will resume it from", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				const handle = yield* opened(fake);
				expect(yield* handle.nativeRef).toEqual(Option.some(SESSION_FILE));
				expect(fake.opened[0]?.resume).toBeUndefined();
			}),
		),
	);

	it.effect("resumes from the session file it was handed", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				yield* opened(fake, { resume: Option.some(SESSION_FILE) });
				expect(fake.opened[0]?.resume).toBe(SESSION_FILE);
			}),
		),
	);

	it.effect("hands pi the prompt a constrained session runs on", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				yield* opened(fake, { constrainedPrompt: "Smooth this board." });
				expect(fake.opened[0]?.constrainedPrompt).toBe("Smooth this board.");
			}),
		),
	);

	it.effect("hands pi the model and thinking level the voyage chose", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				yield* opened(fake, { effort: Option.some("xhigh"), model: Option.some("anthropic/claude-sonnet-4-5") });
				expect(fake.opened[0]).toMatchObject({ cwd: "/moorage", effort: "xhigh", model: "anthropic/claude-sonnet-4-5" });
			}),
		),
	);

	it.effect("refuses an effort pi has no thinking level for", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				const outcome = yield* Effect.exit(opened(fake, { effort: Option.some("ludicrous") }));
				expect(outcome._tag).toBe("Failure");
				expect(fake.opened).toEqual([]);
			}),
		),
	);

	it.effect("steers into running work and queues behind it", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				const handle = yield* opened(fake);
				yield* handle.steer(words("look left"));
				yield* handle.queue(words("then dock"));
				expect(fake.prompts).toEqual([
					{ delivery: "steer", text: "look left" },
					{ delivery: "followUp", text: "then dock" },
				]);
			}),
		),
	);

	it.effect("fails a send pi refuses to accept", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				const handle = yield* opened(fake);
				fake.refuse("no api key found for anthropic");
				const outcome = yield* Effect.exit(handle.steer(words("go on then")));
				expect(outcome._tag).toBe("Failure");
			}),
		),
	);

	const SCREENSHOT = {
		parts: [{ attachmentId: "att", mediaType: "image/png", path: "/tmp/shot.png", position: 0, type: "image" }],
	} as const;

	it.effect("refuses an image, which this backend has never proved it can send", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				const handle = yield* opened(fake);
				const outcome = yield* Effect.exit(handle.queue(SCREENSHOT));
				expect(outcome._tag).toBe("Failure");
			}),
		),
	);

	it.effect("streams what the session said onto the neutral log", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				const handle = yield* opened(fake);
				const listening = yield* Effect.forkChild(firstMessage(handle));
				fake.emit(said("all done"));
				const message = yield* Fiber.join(listening);
				expect(Option.map(message, (event) => (event.type === "message" ? event.text : ""))).toEqual(Option.some("all done"));
			}),
		),
	);

	it.effect("cuts the run when the session is interrupted", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const fake = makeFakePi();
				const handle = yield* opened(fake);
				yield* handle.interrupt;
				expect(fake.aborts()).toBe(1);
			}),
		),
	);

	it.effect("aborts and disposes the pi session when the scope closes", () =>
		Effect.gen(function* () {
			const fake = makeFakePi();
			yield* Effect.scoped(opened(fake));
			expect(fake.aborts()).toBe(1);
			expect(fake.disposed()).toBe(true);
		}),
	);
});
