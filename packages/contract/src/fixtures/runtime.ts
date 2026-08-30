import { Effect, Layer, ManagedRuntime } from "effect";
import { AppInfoSource } from "#app-info.ts";
import { type FixtureFeeds, staticFeeds } from "#fixtures/feeds.ts";
import { info } from "#fixtures/fleet.ts";
import { rulingFixture } from "#fixtures/ruling-source.ts";
import { sightFixture } from "#fixtures/sight-source.ts";
import { voyageFixture } from "#fixtures/voyage-source.ts";
import { windowFixture } from "#fixtures/window-source.ts";
import { SETTINGS } from "#settings/catalog.ts";
import { type SettingsReading, SettingsSource } from "#settings/readings.ts";

// why: a window with no host behind it is a window nobody has overridden
// anything in, so the fixture takes its values from the catalog itself and a
// default changed there needs no second edit here.
const reading: SettingsReading = {
	overridden: [],
	settings: {
		maxParallelSessions: SETTINGS.maxParallelSessions.fallback,
		idleSiestaMinutes: SETTINGS.idleSiestaMinutes.fallback,
		retireRestMinutes: SETTINGS.retireRestMinutes.fallback,
		retireSweep: SETTINGS.retireSweep.fallback,
	},
};

export const makeRuntime = (feeds: FixtureFeeds = staticFeeds) =>
	ManagedRuntime.make(
		Layer.mergeAll(
			Layer.succeed(AppInfoSource, { current: Effect.succeed(info) }),
			Layer.succeed(SettingsSource, {
				change: () => Effect.succeed(reading),
				current: Effect.succeed(reading),
			}),
			rulingFixture(feeds),
			sightFixture(feeds),
			voyageFixture(feeds),
			windowFixture,
		),
	);
