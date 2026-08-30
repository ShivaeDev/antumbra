import { type BackendCapacityController, makeBackendCapacityController } from "@antumbra/plugin-api";
import { it } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { describe, expect } from "vitest";
import { classifyCodexCapacity } from "#capacity.ts";
import { rawOf, toAgentEvents } from "#mapping.ts";
import { makeCodexServer } from "#server.ts";
import { makeFakeAppServer } from "#test/fake.ts";

const notification = (codexErrorInfo: string, willRetry: boolean) => ({
	method: "error",
	params: {
		error: {
			additionalDetails: null,
			codexErrorInfo,
			message: "You've hit your usage limit",
		},
		threadId: "thread-1",
		turnId: "turn-1",
		willRetry,
	},
});

describe("codex capacity evidence", () => {
	it("blocks usage-limit exhaustion without consuming the raw session event", () => {
		const exhausted = notification("usageLimitExceeded", false);

		expect(Option.getOrThrow(classifyCodexCapacity(rawOf(exhausted.method, exhausted.params)))).toEqual({
			detail: "You've hit your usage limit",
			reason: "usage-limit",
			status: "blocked",
		});
		expect(toAgentEvents(exhausted)).toMatchObject([
			{
				raw: { kind: "error", source: "codex" },
				type: "raw",
			},
		]);
	});

	it("does not classify retrying usage errors or server overload as exhaustion", () => {
		for (const error of [notification("usageLimitExceeded", true), notification("serverOverloaded", false)]) {
			expect(Option.isNone(classifyCodexCapacity(rawOf(error.method, error.params)))).toBe(true);
		}
	});

	it.effect("feeds every app-server notification to capacity exactly once", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const controller = yield* makeBackendCapacityController(classifyCodexCapacity);
				let observations = 0;
				const counting: BackendCapacityController = {
					observe: (raw, observedAt) => {
						observations += 1;
						return controller.observe(raw, observedAt);
					},
					source: controller.source,
				};
				const fake = makeFakeAppServer();
				const server = yield* makeCodexServer({
					observeCapacity: counting.observe,
					spawn: () => fake.process,
				});
				const received = yield* PubSub.subscribe(server.notifications);

				const exhausted = notification("usageLimitExceeded", false);
				fake.notify(exhausted.method, exhausted.params);
				const published = yield* PubSub.take(received);
				expect(observations).toBe(1);
				expect(published).toEqual(exhausted);
				expect(toAgentEvents(published)[0]?.raw).toEqual(rawOf(exhausted.method, exhausted.params));
				expect(Option.getOrThrow(yield* controller.source.current)).toMatchObject({
					observedAt: expect.any(Number),
					reason: "usage-limit",
					status: "blocked",
				});

				const overloaded = notification("serverOverloaded", false);
				fake.notify(overloaded.method, overloaded.params);
				expect(observations).toBe(2);
				expect(Option.getOrThrow(yield* controller.source.current)).toMatchObject({
					reason: "usage-limit",
					status: "blocked",
				});
			}),
		),
	);
});
