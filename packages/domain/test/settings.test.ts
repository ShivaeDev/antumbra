import { SETTINGS, SettingsSource } from "@antumbra/contract";
import {
	persistenceIt,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SettingsSourceLive } from "#settings.ts";

const persistence = persistenceIt();

persistence.effectDB(
	"answers the catalog for a setting nothing has set",
	function* () {
		yield* Effect.gen(function* () {
			const reading = yield* (yield* SettingsSource).current;
			expect(reading.settings).toEqual({
				maxParallelSessions: SETTINGS.maxParallelSessions.fallback,
				idleSiestaMinutes: 60,
				retireRestMinutes: SETTINGS.retireRestMinutes.fallback,
				retireSweep: SETTINGS.retireSweep.fallback,
			});
			expect(reading.overridden).toEqual([]);
		}).pipe(Effect.provide(SettingsSourceLive));
	},
);

persistence.effectDB(
	"keeps a changed value typed by its declaration",
	function* () {
		yield* Effect.gen(function* () {
			const source = yield* SettingsSource;
			const switched = yield* source.change({
				key: "retireSweep",
				value: false,
			});
			expect(switched.settings.retireSweep).toBe(false);
			expect(switched.overridden).toEqual(["retireSweep"]);
			const rested = yield* source.change({
				key: "retireRestMinutes",
				value: 45,
			});
			expect(rested.settings.retireRestMinutes).toBe(45);
			expect(rested.settings.retireSweep).toBe(false);
		}).pipe(Effect.provide(SettingsSourceLive));
	},
);

persistence.effectDB(
	"falls back to the catalog when a stored value no longer decodes",
	function* (db) {
		yield* db.Setting.create({ key: "retireRestMinutes", value: '"often"' });
		yield* Effect.gen(function* () {
			const reading = yield* (yield* SettingsSource).current;
			expect(reading.settings.retireRestMinutes).toBe(
				SETTINGS.retireRestMinutes.fallback,
			);
			expect(reading.overridden).toEqual([]);
		}).pipe(Effect.provide(SettingsSourceLive));
	},
);

persistence.effectDB(
	"refuses a value its declaration does not accept and stores nothing",
	function* (db) {
		yield* Effect.gen(function* () {
			const refused = yield* Effect.flip(
				(yield* SettingsSource).change({
					key: "maxParallelSessions",
					value: 0,
				}),
			);
			expect(String(refused)).toContain("a whole number from 1 to 64");
		}).pipe(Effect.provide(SettingsSourceLive));
		expect(yield* db.Setting.all()).toEqual([]);
	},
);

persistence.effectDB(
	"forgets the row when the declared value is chosen again",
	function* (db) {
		yield* Effect.gen(function* () {
			const source = yield* SettingsSource;
			yield* source.change({ key: "maxParallelSessions", value: 7 });
			const restored = yield* source.change({
				key: "maxParallelSessions",
				value: SETTINGS.maxParallelSessions.fallback,
			});
			expect(restored.overridden).toEqual([]);
		}).pipe(Effect.provide(SettingsSourceLive));
		expect(yield* db.Setting.all()).toEqual([]);
	},
);

it.effect("reads a changed setting back from a fresh source", () =>
	Effect.acquireUseRelease(
		Effect.sync(temporaryPersistence),
		(temporary) =>
			Effect.gen(function* () {
				const live = SettingsSourceLive.pipe(
					Layer.provideMerge(temporary.layer),
				);
				yield* Effect.gen(function* () {
					yield* (yield* SettingsSource).change({
						key: "maxParallelSessions",
						value: 7,
					});
				}).pipe(Effect.provide(live));
				yield* Effect.gen(function* () {
					const reading = yield* (yield* SettingsSource).current;
					expect(reading.settings.maxParallelSessions).toBe(7);
					expect(reading.overridden).toEqual(["maxParallelSessions"]);
				}).pipe(Effect.provide(live));
			}),
		(temporary) => Effect.sync(temporary.remove),
	),
);
