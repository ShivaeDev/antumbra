import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { Registration } from "@antumbra/platform-runner/log.ts";
import type { Operation, OperationResult, Reply } from "@antumbra/platform-runner/operations.ts";
import { Context, Deferred, Effect, Layer, Queue, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import { type Observation, type Reported, reported } from "#runner/reported.ts";

export class RunnerConnections extends Context.Service<
	RunnerConnections,
	{
		readonly landed: (logId: string, observation: Observation) => Effect.Effect<void>;
		readonly news: (logId: string, observation: Observation) => Effect.Effect<boolean>;
		readonly operations: (registration: Registration) => Stream.Stream<Operation>;
		readonly reply: (reply: Reply) => Effect.Effect<void>;
	}
>()("@antumbra/server/RunnerConnections") {}

interface Pending {
	readonly operation: Operation;
	readonly answer: Deferred.Deferred<OperationResult>;
}

interface Connected {
	readonly registration: Registration;
	readonly queue: Queue.Queue<Operation>;
	readonly reported: Reported;
}

export const layer = Layer.effectContext(
	Effect.gen(function* () {
		const reactivity = yield* Reactivity;
		const connections = new Map<string, Connected>();
		const pending = new Map<string, Map<string, Pending>>();
		const walking = (logId: string): Reported | undefined => {
			for (const connection of connections.values()) if (connection.registration.logId === logId) return connection.reported;
			return undefined;
		};
		const news = (logId: string, observation: Observation): Effect.Effect<boolean> =>
			Effect.sync(() => {
				const walk = walking(logId);
				return walk === undefined || walk.news(observation);
			});
		const landed = (logId: string, observation: Observation): Effect.Effect<void> =>
			Effect.sync(() => {
				walking(logId)?.landed(observation);
			});
		const waiting = (runnerId: string): Map<string, Pending> => {
			const known = pending.get(runnerId);
			if (known !== undefined) return known;
			const entries = new Map<string, Pending>();
			pending.set(runnerId, entries);
			return entries;
		};
		const execute = Effect.fn("RunnerOperations.execute")(function* (runnerId: string, operation: Operation) {
			const entries = waiting(runnerId);
			const known = entries.get(operation.requestId);
			if (known !== undefined) return yield* Deferred.await(known.answer);
			const answer = yield* Deferred.make<OperationResult>();
			entries.set(operation.requestId, { operation, answer });
			const connection = connections.get(runnerId);
			if (connection !== undefined) yield* Queue.offer(connection.queue, operation);
			return yield* Deferred.await(answer);
		});
		const connect = Effect.fn("RunnerConnections.connect")(function* (connection: Connected) {
			const runnerId = connection.registration.runnerId;
			const previous = connections.get(runnerId);
			connections.set(runnerId, connection);
			if (previous !== undefined) yield* Queue.shutdown(previous.queue);
			yield* Queue.offerAll(
				connection.queue,
				[...waiting(runnerId).values()].map((entry) => entry.operation),
			);
			yield* reactivity.invalidate(["runner:connected"]);
		});
		const disconnect = Effect.fn("RunnerConnections.disconnect")(function* (connection: Connected) {
			const runnerId = connection.registration.runnerId;
			if (connections.get(runnerId) === connection) {
				connections.delete(runnerId);
				yield* reactivity.invalidate(["runner:connected"]);
			}
			yield* Queue.shutdown(connection.queue);
		});
		const operations = (registration: Registration): Stream.Stream<Operation> =>
			Stream.unwrap(
				Effect.gen(function* () {
					const connection = { registration, queue: yield* Queue.make<Operation>(), reported: reported() };
					yield* Effect.acquireRelease(connect(connection), () => disconnect(connection));
					return Stream.fromQueue(connection.queue);
				}),
			);
		const reply = Effect.fn("RunnerConnections.reply")(function* (reply: Reply) {
			const entries = pending.get(reply.runnerId);
			const entry = entries?.get(reply.requestId);
			if (entry === undefined) return;
			entries?.delete(reply.requestId);
			yield* Deferred.succeed(entry.answer, reply.result);
		});
		return Context.make(RunnerOperations, {
			connected: Effect.sync(() => [...connections.values()].map(({ registration }) => registration)),
			execute,
		}).pipe(Context.add(RunnerConnections, { landed, news, operations, reply }));
	}),
);
