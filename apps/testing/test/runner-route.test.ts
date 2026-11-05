import { setCount } from "@antumbra/domain-settings/commands/set-count.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Fiber, Queue, Stream } from "effect";
import { expect } from "vitest";
import { eventually } from "#answers.ts";
import { it } from "#entry.ts";
import type { hosted } from "#hosted.ts";

const exchange = (host: Effect.Success<ReturnType<typeof hosted>>, native: boolean) =>
	Effect.gen(function* () {
		const { operations, reactivity } = host;
		const calls = native ? yield* host.unixCredentials(host.options.bearerToken) : host.calls;

		const refusal = yield* Effect.flip(
			calls["settings.setCount"]({ requestId: Request.make("rejected:socket"), key: "maxParallelSessions", count: 100 }),
		);
		expect(refusal).toBeInstanceOf(setCount.Rejection.OutOfRange);
		expect(refusal).toMatchObject({ _tag: "OutOfRange", field: "count" });
		expect(yield* calls["settings.setCount"]({ requestId: Request.make("accepted:socket"), key: "maxParallelSessions", count: 9 })).toBeGreaterThan(
			0,
		);

		const registration = { runnerId: "runner:socket", logId: "log:socket", backends: ["claude"], imageInputBackends: [] };
		yield* Effect.scoped(
			Effect.gen(function* () {
				const incoming = yield* calls["runner.operations"](registration).pipe(Stream.toQueue({ capacity: "unbounded" }));
				yield* eventually(
					reactivity.stream(["runner:connected"], operations.connected),
					(runners) => runners.some((runner) => runner.runnerId === registration.runnerId),
					"the runner to appear as connected",
				);
				const discovery = yield* Queue.take(incoming);
				if (discovery.type !== "ListModels") return yield* Effect.die(new Error(`Expected model discovery, received ${discovery.type}`));
				expect(discovery.backend).toBe("claude");
				yield* calls["runner.reply"]({
					runnerId: registration.runnerId,
					requestId: discovery.requestId,
					result: { type: "ModelsListed", backend: "claude", models: [], failure: null },
				});
				const request = { type: "Interrupt" as const, requestId: "interrupt:socket", sessionId: "session:socket" };
				const dispatched = yield* Effect.forkScoped(operations.execute(registration.runnerId, request));
				expect(yield* Queue.take(incoming)).toEqual(request);
				yield* calls["runner.reply"]({ runnerId: registration.runnerId, requestId: request.requestId, result: { type: "Accepted" } });
				expect(yield* Fiber.join(dispatched)).toEqual({ type: "Accepted" });
				expect(yield* calls["runner.cursor"]({ logId: registration.logId })).toBe(-1);
			}),
		);
		yield* eventually(
			reactivity.stream(["runner:connected"], operations.connected),
			(runners) => runners.every((runner) => runner.runnerId !== registration.runnerId),
			"the interrupted RPC stream to release the runner registration",
		);
	});

it.app("the production RPC endpoint authenticates runners and exchanges operations", function* ({ host }) {
	yield* exchange(yield* host(), false);
});

it.app("the native Unix endpoint exchanges runner operations and releases a cancelled subscription", function* ({ host }) {
	yield* exchange(yield* host(), true);
});
