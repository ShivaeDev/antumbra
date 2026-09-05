import { Effect, Layer, ManagedRuntime } from "effect";
import { AppInfoSource } from "#app-info.ts";
import { AppLifecycleSource } from "#app-lifecycle.ts";
import { type FixtureFeeds, staticFeeds } from "#fixtures/feeds.ts";
import { info } from "#fixtures/fleet.ts";
import { holdFixture } from "#fixtures/hold-source.ts";
import { rulingFixture } from "#fixtures/ruling-source.ts";
import { sightFixture } from "#fixtures/sight-source.ts";
import { voyageFixture } from "#fixtures/voyage-source.ts";
import { windowFixture } from "#fixtures/window-source.ts";
import { SETTINGS } from "#settings/catalog.ts";
import { type SettingsReading, SettingsSource } from "#settings/readings.ts";

const reading: SettingsReading = {
	overridden: [],
	settings: {
		foldToolCalls: SETTINGS.foldToolCalls.fallback,
		maxParallelSessions: SETTINGS.maxParallelSessions.fallback,
		idleSiestaMinutes: SETTINGS.idleSiestaMinutes.fallback,
		routineMailMinutes: SETTINGS.routineMailMinutes.fallback,
		retireRestMinutes: SETTINGS.retireRestMinutes.fallback,
		retireSweep: SETTINGS.retireSweep.fallback,
		holdEverything: SETTINGS.holdEverything.fallback,
		holdPieceDispatch: SETTINGS.holdPieceDispatch.fallback,
		holdWakes: SETTINGS.holdWakes.fallback,
	},
};

export const makeRuntime = (feeds: FixtureFeeds = staticFeeds) =>
	ManagedRuntime.make(
		Layer.mergeAll(
			Layer.succeed(AppInfoSource, { current: Effect.succeed(info) }),
			Layer.succeed(AppLifecycleSource, { restart: Effect.void }),
			Layer.succeed(SettingsSource, {
				change: () => Effect.succeed(reading),
				current: Effect.succeed(reading),
			}),
			holdFixture(feeds),
			rulingFixture(feeds),
			sightFixture(feeds),
			voyageFixture(feeds),
			windowFixture,
		),
	);
