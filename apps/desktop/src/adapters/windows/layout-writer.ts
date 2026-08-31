import { Effect, Queue, Ref } from "effect";
import { layoutOf, type WindowLayout } from "#adapters/windows/layout.ts";
import type { LayoutStore } from "#adapters/windows/layout-store.ts";
import type { WindowRegistry } from "#adapters/windows/registry.ts";

export const layoutSnapshot = (registry: WindowRegistry): WindowLayout =>
	layoutOf(
		registry.all().map((record) => ({ id: record.id, place: record.place })),
		registry.focused() ?? null,
	);

export interface LayoutWriter {
	readonly note: Effect.Effect<void>;
	readonly run: Effect.Effect<void>;
}

export interface LayoutWriterInput {
	readonly patience: number;
	readonly registry: WindowRegistry;
	readonly store: LayoutStore;
}

export const layoutWriter = (input: LayoutWriterInput): Effect.Effect<LayoutWriter> =>
	Effect.gen(function* () {
		const tick = yield* Queue.sliding<void>(1);
		const pending = yield* Ref.make(false);
		const run = Effect.gen(function* () {
			while (true) {
				yield* Queue.take(tick);
				yield* Effect.sleep(input.patience);
				if (yield* Ref.getAndSet(pending, false)) {
					yield* input.store.save(layoutSnapshot(input.registry));
				}
			}
		});
		return {
			note: Ref.set(pending, true).pipe(Effect.andThen(Queue.offer(tick, undefined)), Effect.asVoid),
			run,
		};
	});
