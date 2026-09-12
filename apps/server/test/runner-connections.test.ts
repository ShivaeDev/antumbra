import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { Operation } from "@antumbra/platform-runner/operations.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Option, Queue, Stream } from "effect";
import * as Reactivity from "effect/unstable/reactivity/Reactivity";
import { layer, RunnerConnections } from "#runner/connections.ts";

const registration = { runnerId: "local", logId: "local-log", backends: ["codex"], imageInputBackends: ["codex"] };
const operation = { type: "Drain", requestId: "drain-one" } as const;
const services = layer.pipe(Layer.provide(Reactivity.layer));

it.effect("dispatches to the connected runner and answers the waiting caller", () =>
	Effect.gen(function* () {
		const runner = yield* RunnerOperations;
		const connections = yield* RunnerConnections;
		const received = yield* Queue.make<Operation>();
		const stream = yield* Effect.forkScoped(Stream.runForEach(connections.operations(registration), (operation) => Queue.offer(received, operation)));
		const call = yield* Effect.forkScoped(runner.execute(registration.runnerId, operation));
		expect(yield* Queue.take(received)).toEqual(operation);
		expect(yield* runner.connected).toEqual([registration]);
		yield* connections.reply({ runnerId: registration.runnerId, requestId: operation.requestId, result: { type: "Accepted" } });
		expect(yield* Fiber.join(call)).toEqual({ type: "Accepted" });
		yield* Fiber.interrupt(stream);
		expect(yield* runner.connected).toEqual([]);
	}).pipe(Effect.provide(services)),
);

it.effect("replays an unanswered operation after the runner reconnects", () =>
	Effect.gen(function* () {
		const runner = yield* RunnerOperations;
		const connections = yield* RunnerConnections;
		const call = yield* Effect.forkScoped(runner.execute(registration.runnerId, operation));
		const first = yield* Stream.runHead(connections.operations(registration));
		expect(first).toEqual(Option.some(operation));
		expect(yield* runner.connected).toEqual([]);
		const replay = yield* Stream.runHead(connections.operations(registration));
		expect(replay).toEqual(first);
		yield* connections.reply({ runnerId: registration.runnerId, requestId: operation.requestId, result: { type: "Refused", reason: "busy" } });
		expect(yield* Fiber.join(call)).toEqual({ type: "Refused", reason: "busy" });
	}).pipe(Effect.provide(services)),
);
