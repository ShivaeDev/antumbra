import type { Fields, Values } from "@antumbra/platform-feature/fields.ts";
import type { PortServices, PortShape } from "@antumbra/platform-feature/port.ts";
import type { QueryDefinition } from "@antumbra/platform-feature/query.ts";
import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { Cause, Clock, Deferred, Effect, Exit, Fiber, FiberHandle, Queue, type Schema, type Scope, Stream } from "effect";
import { Live } from "#live.ts";

export interface Reconciler {
	readonly refresh: Effect.Effect<void>;
	readonly await: Effect.Effect<void>;
}

export type Due<Value> = (value: Value, now: number) => number | undefined;

type Fail = (cause: Cause.Cause<never>) => Effect.Effect<unknown>;

type Timer = FiberHandle.FiberHandle<void>;

const waking = Effect.fn("Reconciler.waking")(function* <Value>(timer: Timer, pending: Queue.Queue<void>, value: Value, due: Due<Value>) {
	const now = yield* Clock.currentTimeMillis;
	const at = due(value, now);
	if (at === undefined || at <= now) return yield* FiberHandle.clear(timer);
	yield* FiberHandle.run(timer, Effect.andThen(Effect.sleep(at - now), Effect.asVoid(Queue.offer(pending, undefined))));
});

const watching = <Value, Needs, R>(
	values: Stream.Stream<Value, never, Needs>,
	snapshot: Effect.Effect<Value, never, Needs>,
	act: (value: Value, fail: Fail) => Effect.Effect<void, never, R>,
	due?: Due<Value>,
): Effect.Effect<Reconciler, never, Needs | R | Scope.Scope> =>
	Effect.gen(function* () {
		const pending = yield* Queue.sliding<void>(1);
		const failed = yield* Deferred.make<never>();
		const timer: Timer = yield* FiberHandle.make<void>();
		const consume = Effect.forever(
			Effect.andThen(
				Queue.take(pending),
				Effect.flatMap(snapshot, (value) =>
					Effect.andThen(
						act(value, (cause) => Deferred.failCause(failed, cause)),
						due === undefined ? Effect.void : waking(timer, pending, value, due),
					),
				),
			),
		);
		const work = Effect.scoped(
			Effect.raceAllFirst([Stream.runForEach(values, () => Queue.offer(pending, undefined)), consume, Deferred.await(failed)]),
		);
		const fiber = yield* Effect.forkScoped(work);
		return {
			refresh: Effect.asVoid(Queue.offer(pending, undefined)),
			await: Effect.asVoid(Fiber.join(fiber)),
		};
	});

export const run = <
	Name extends string,
	Input extends Fields,
	Output extends Schema.Top,
	Reads extends readonly RowShape[],
	Ports extends readonly PortShape[],
	R,
>(
	query: QueryDefinition<Name, Input, Output, Reads, Ports>,
	input: Values<Input>,
	act: (rows: Output["Type"]) => Effect.Effect<void, never, R>,
	due?: Due<Output["Type"]>,
): Effect.Effect<Reconciler, never, Live | PortServices<Ports> | Scope.Scope | R> =>
	Effect.gen(function* () {
		const live = yield* Live;
		return yield* watching(live.live(query, input), live.read(query, input), act, due);
	});

export const each = <
	Name extends string,
	Input extends Fields,
	Output extends Schema.Top & { readonly Type: readonly unknown[] },
	Reads extends readonly RowShape[],
	Ports extends readonly PortShape[],
	Key,
	R,
>(
	query: QueryDefinition<Name, Input, Output, Reads, Ports>,
	input: Values<Input>,
	keyOf: (row: Output["Type"][number]) => Key,
	act: (row: Output["Type"][number]) => Effect.Effect<void, never, R>,
): Effect.Effect<Reconciler, never, Live | PortServices<Ports> | Scope.Scope | R> =>
	Effect.gen(function* () {
		const live = yield* Live;
		const claims = new Map<Key, { fiber?: Fiber.Fiber<void> }>();
		return yield* watching(
			live.live(query, input),
			live.read(query, input),
			Effect.fn("Reconciler.eachSnapshot")(function* (rows, fail) {
				const matching = new Set(rows.map(keyOf));
				yield* releaseAbsent(claims, matching);
				for (const row of rows) {
					const key = keyOf(row);
					if (claims.has(key)) continue;
					const claim: { fiber?: Fiber.Fiber<void> } = {};
					claims.set(key, claim);
					claim.fiber = yield* Effect.forkScoped(Effect.scoped(act(row)).pipe(Effect.onExit(settled(claims, key, fail))));
				}
			}),
		);
	});

interface Claim {
	fiber?: Fiber.Fiber<void>;
}
const settled =
	<Key>(claims: Map<Key, Claim>, key: Key, fail: Fail) =>
	(exit: Exit.Exit<void>) => {
		if (Exit.isSuccess(exit)) return Effect.void;
		claims.delete(key);
		return Cause.hasInterruptsOnly(exit.cause) ? Effect.void : Effect.asVoid(fail(exit.cause));
	};

const releaseAbsent = Effect.fn("Reconciler.releaseAbsent")(function* <Key>(claims: Map<Key, Claim>, matching: ReadonlySet<Key>) {
	for (const [key, claim] of claims) {
		if (matching.has(key)) continue;
		claims.delete(key);
		if (claim.fiber !== undefined) yield* Fiber.interrupt(claim.fiber);
	}
});
