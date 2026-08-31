import { Effect, Semaphore } from "effect";
import { layoutOf, type WindowLayout } from "#adapters/windows/layout.ts";
import type { LayoutStore } from "#adapters/windows/layout-store.ts";
import type { WindowRegistry } from "#adapters/windows/registry.ts";

const layoutSnapshot = (registry: WindowRegistry): WindowLayout =>
	layoutOf(
		registry.all().map((record) => ({ id: record.id, place: record.place })),
		registry.focused() ?? null,
	);

interface LayoutWriter {
	readonly note: Effect.Effect<void>;
}

interface LayoutWriterInput {
	readonly registry: WindowRegistry;
	readonly store: LayoutStore;
}

export const layoutWriter = (input: LayoutWriterInput): Effect.Effect<LayoutWriter> =>
	Effect.gen(function* () {
		const writes = yield* Semaphore.make(1);
		return {
			note: writes.withPermits(1)(Effect.suspend(() => input.store.save(layoutSnapshot(input.registry)))),
		};
	});
