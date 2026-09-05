import type { OpenSessionOptions } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { makeCodexServer } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";
import { textInput } from "#test/input.ts";
import { openThreadSession } from "#thread.ts";

const sailing = (effort: Option.Option<string>, model: Option.Option<string>): OpenSessionOptions => ({
	cwd: "/moorage",
	effort,
	model,
	resume: Option.none(),
	sessionId: "session-1",
	tools: [],
});

const opened = (options: OpenSessionOptions) =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer();
		const server = yield* makeCodexServer({ spawn: () => fake.process });
		const handle = yield* openThreadSession(server, options);
		return { fake, handle };
	});

it.live("the chosen model opens the thread and rides on every turn beside the effort", () =>
	Effect.gen(function* () {
		const { fake, handle } = yield* opened(sailing(Option.some("high"), Option.some("gpt-5-codex")));
		expect(fake.requests[1]?.params).toMatchObject({ model: "gpt-5-codex" });
		expect(fake.requests[1]?.params).not.toHaveProperty("effort");

		yield* handle.queue(textInput("come about"));
		expect(fake.requests.at(-1)?.method).toBe("turn/start");
		expect(fake.requests.at(-1)?.params).toMatchObject({ effort: "high", model: "gpt-5-codex" });
	}).pipe(Effect.scoped),
);

it.live("a voyage that names neither leaves Codex on its own", () =>
	Effect.gen(function* () {
		const { fake, handle } = yield* opened(sailing(Option.none(), Option.none()));
		yield* handle.queue(textInput("come about"));
		expect(fake.requests[1]?.params).not.toHaveProperty("model");
		expect(fake.requests.at(-1)?.params).not.toHaveProperty("effort");
	}).pipe(Effect.scoped),
);

it.live("an effort that names nothing at all is refused before the thread opens", () =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer();
		const server = yield* makeCodexServer({ spawn: () => fake.process });
		const refused = yield* Effect.flip(Effect.scoped(openThreadSession(server, sailing(Option.some(""), Option.none()))));
		expect(refused.detail).toContain("is not a reasoning effort");
		expect(fake.requests.map((request) => request.method)).toEqual(["initialize"]);
	}).pipe(Effect.scoped),
);
