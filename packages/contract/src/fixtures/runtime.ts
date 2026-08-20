import { Effect, Layer, ManagedRuntime } from "effect";
import { AppInfoSource } from "#app-info.ts";
import { type FixtureFeeds, staticFeeds } from "#fixtures/feeds.ts";
import { info } from "#fixtures/fleet.ts";
import { sightFixture } from "#fixtures/sight-source.ts";
import { voyageFixture } from "#fixtures/voyage-source.ts";

export const makeRuntime = (feeds: FixtureFeeds = staticFeeds) =>
	ManagedRuntime.make(
		Layer.mergeAll(
			Layer.succeed(AppInfoSource, { current: Effect.succeed(info) }),
			sightFixture(feeds),
			voyageFixture(feeds),
		),
	);
