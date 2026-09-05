import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { codexFailure } from "#failure.ts";
import { makeCodexServer } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";
import { textInput } from "#test/input.ts";
import { turnRequests } from "#turn-requests.ts";
import { makeTurnDriver } from "#turns.ts";

const steeringRejected = (detail: string) =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer();
		const server = yield* makeCodexServer({ skills: "/antumbra/skills", spawn: () => fake.process });
		const driver = yield* makeTurnDriver(
			{
				...server,
				request: (method, params, timeout) => (method === "turn/steer" ? Effect.fail(codexFailure(detail)) : server.request(method, params, timeout)),
			},
			"thread-1",
			{},
		);
		yield* driver.steer(textInput("first"));
		return { driver, fake };
	});

it.live("starts a fresh turn when Codex rejects an inactive turn", () =>
	Effect.gen(function* () {
		for (const detail of ["no active turn", "expected active turn id turn-1"]) {
			const { driver, fake } = yield* steeringRejected(detail);
			yield* driver.steer(textInput("second"));
			expect(fake.requests.at(-1)?.params).toMatchObject({ input: [{ text: "second" }] });
		}
	}),
);

it.live("a missing thread remains a delivery failure", () =>
	Effect.gen(function* () {
		const detail = "thread not found";
		const { driver } = yield* steeringRejected(detail);
		expect(yield* Effect.flip(driver.steer(textInput("second")))).toMatchObject({ detail });
	}),
);

it.live("interrupt accepts an inactive turn or a timeout while draining", () =>
	Effect.gen(function* () {
		const fake = makeFakeAppServer();
		const server = yield* makeCodexServer({ skills: "/antumbra/skills", spawn: () => fake.process });
		for (const detail of ["no active turn", "timeout waiting for turn/interrupt"]) {
			const requests = turnRequests({ ...server, request: () => Effect.fail(codexFailure(detail)) }, "thread-1", {});
			expect(yield* Effect.exit(requests.interrupt("turn-1"))).toMatchObject({ _tag: "Success" });
		}
	}),
);
