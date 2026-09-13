import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { Registration } from "@antumbra/platform-runner/log.ts";
import type { Operation, OperationResult, Reply } from "@antumbra/platform-runner/operations.ts";
import { Context, Deferred, Effect, Layer, Queue, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";

export class RunnerConnections extends Context.Service<
	RunnerConnections,
	{
		readonly news: (logId: string, subject: string, content: string) => Effect.Effect<boolean>;
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
}

export const layer = Layer.effectContext(
	Effect.gen(function* () {
		const reactivity = yield* Reactivity;
		const connections = new Map<string, Connected>();
		const pending = new Map<string, Map<string, Pending>>();
		const reported = new Map<string, Map<string, string>>();
		const news = (logId: string, subject: string, content: string): Effect.Effect<boolean> =>
			Effect.sync(() => {
				const known = reported.get(logId) ?? new Map<string, string>();
				reported.set(logId, known);
				if (known.get(subject) === content) return false;
				known.set(subject, content);
				return true;
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
			reported.delete(connection.registration.logId);
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
					const connection = { registration, queue: yield* Queue.make<Operation>() };
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
		}).pipe(Context.add(RunnerConnections, { news, operations, reply }));
	}),
);
