import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { codexFailure } from "#failure.ts";
import { makeCodexServer } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";
import { textInput } from "#test/input.ts";
import { makeTurnDriver } from "#turns.ts";

const steeringRejected = (detail: string) =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer();
		const server = yield* makeCodexServer({ spawn: () => fake.process });
		const driver = yield* makeTurnDriver(
			{
				...server,
				request: (method, params, timeout) => (method === "turn/steer" ? Effect.fail(codexFailure(detail)) : server.request(method, params, timeout)),
			},
			"thread-1",
		);
		yield* driver.steer(textInput("first"));
		return { driver, fake };
	});

it.live("starts a fresh turn when Codex rejects an inactive turn", () =>
	Effect.gen(function* () {
		const { driver, fake } = yield* steeringRejected("no active turn");
		yield* driver.steer(textInput("second"));
		expect(fake.requests.at(-1)?.params).toMatchObject({ input: [{ text: "second" }] });
	}),
);

it.live("a missing thread remains a delivery failure", () =>
	Effect.gen(function* () {
		const detail = "thread not found";
		const { driver } = yield* steeringRejected(detail);
		expect(yield* Effect.flip(driver.steer(textInput("second")))).toMatchObject({ detail });
	}),
);
