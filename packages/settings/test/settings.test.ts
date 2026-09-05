import { SETTINGS, SettingsSource } from "@antumbra/contract";
import { it } from "@antumbra/persistence/testing";
import { SettingsSourceLive } from "@antumbra/settings";
import { expect } from "@effect/vitest";
import { Effect } from "effect";

it.effectDB("answers the catalog for a setting nothing has set", function* () {
	yield* Effect.gen(function* () {
		const reading = yield* (yield* SettingsSource).current;
		expect(reading.settings).toEqual({
			foldToolCalls: false,
			maxParallelSessions: 4,
			idleSiestaMinutes: 60,
			routineMailMinutes: 5,
			retireRestMinutes: 15,
			retireSweep: true,
		});
		expect(reading.overridden).toEqual([]);
	}).pipe(Effect.provide(SettingsSourceLive));
});

it.effectDB("keeps a changed value typed by its declaration", function* () {
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
});

it.effectDB("refuses a value its declaration does not accept and stores nothing", function* (db) {
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
});

it.effectDB("forgets the row when the declared value is chosen again", function* (db) {
	yield* Effect.gen(function* () {
		const source = yield* SettingsSource;
		yield* source.change({ key: "maxParallelSessions", value: 7 });
		yield* source.change({
			key: "maxParallelSessions",
			value: SETTINGS.maxParallelSessions.fallback,
		});
	}).pipe(Effect.provide(SettingsSourceLive));
	expect(yield* db.Setting.all()).toEqual([]);
});
