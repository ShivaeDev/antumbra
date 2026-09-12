import type { Fields, Values } from "@antumbra/platform-feature/fields.ts";
import type { PortServices, PortShape } from "@antumbra/platform-feature/port.ts";
import type { QueryDefinition } from "@antumbra/platform-feature/query.ts";
import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { Cause, Deferred, Effect, Exit, Fiber, Queue, type Schema, type Scope, Stream } from "effect";
import { Live } from "#live.ts";

export interface Reconciler {
	readonly refresh: Effect.Effect<void>;
	readonly await: Effect.Effect<void>;
}

type Fail = (cause: Cause.Cause<never>) => Effect.Effect<unknown>;

const watching = <Value, Needs, R>(
	values: Stream.Stream<Value, never, Needs>,
	snapshot: Effect.Effect<Value, never, Needs>,
	act: (value: Value, fail: Fail) => Effect.Effect<void, never, R>,
): Effect.Effect<Reconciler, never, Needs | R | Scope.Scope> =>
	Effect.gen(function* () {
		const pending = yield* Queue.sliding<void>(1);
		const failed = yield* Deferred.make<never>();
		const consume = Effect.forever(
			Effect.andThen(
				Queue.take(pending),
				Effect.flatMap(snapshot, (value) => act(value, (cause) => Deferred.failCause(failed, cause))),
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
): Effect.Effect<Reconciler, never, Live | PortServices<Ports> | Scope.Scope | R> =>
	Effect.gen(function* () {
		const live = yield* Live;
		return yield* watching(live.live(query, input), live.read(query, input), act);
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
