import {
	DEFAULT_MAX_PARALLEL_SESSIONS,
	SettingsSource,
} from "@antumbra/contract";
import { temporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SettingsSourceLive } from "#settings.ts";

it.effect("uses the compatibility default and durably replaces it", () =>
	Effect.acquireUseRelease(
		Effect.sync(temporaryPersistence),
		(temporary) =>
			Effect.gen(function* () {
				yield* Effect.gen(function* () {
					const source = yield* SettingsSource;
					expect((yield* source.current).maxParallelSessions).toBe(
						DEFAULT_MAX_PARALLEL_SESSIONS,
					);
					yield* source.update({ maxParallelSessions: 7 });
				}).pipe(
					Effect.provide(
						SettingsSourceLive.pipe(Layer.provideMerge(temporary.layer)),
					),
				);
				yield* Effect.gen(function* () {
					const source = yield* SettingsSource;
					expect(yield* source.current).toEqual({ maxParallelSessions: 7 });
				}).pipe(
					Effect.provide(
						SettingsSourceLive.pipe(Layer.provideMerge(temporary.layer)),
					),
				);
			}),
		(temporary) => Effect.sync(temporary.remove),
	),
);
