import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { Registration } from "@antumbra/platform-runner/log.ts";
import type { Operation, OperationResult, Reply } from "@antumbra/platform-runner/operations.ts";
import { Context, Deferred, Effect, Layer, Queue, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";

export class RunnerConnections extends Context.Service<
	RunnerConnections,
	{
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

export const layer = Layer.effectContext(Effect.gen(function* () {
	const reactivity = yield* Reactivity;
	const connections = new Map<string, Connected>();
	const pending = new Map<string, Map<string, Pending>>();
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
	const operations = (registration: Registration): Stream.Stream<Operation> => Stream.unwrap(Effect.gen(function* () {
		const connection = { registration, queue: yield* Queue.make<Operation>() };
		yield* Effect.acquireRelease(
			Effect.gen(function* () {
				const previous = connections.get(registration.runnerId);
				connections.set(registration.runnerId, connection);
				if (previous !== undefined) yield* Queue.shutdown(previous.queue);
				yield* Queue.offerAll(connection.queue, [...waiting(registration.runnerId).values()].map((entry) => entry.operation));
				yield* reactivity.invalidate(["runner:connected"]);
			}),
			() => Effect.gen(function* () {
				if (connections.get(registration.runnerId) === connection) {
					connections.delete(registration.runnerId);
					yield* reactivity.invalidate(["runner:connected"]);
				}
				yield* Queue.shutdown(connection.queue);
			}),
		);
		return Stream.fromQueue(connection.queue);
	}));
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
	}).pipe(Context.add(RunnerConnections, { operations, reply }));
}));
