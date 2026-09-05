import { Layer } from "effect";
import type { FixtureFeeds } from "#fixtures/feeds.ts";
import { HoldSource } from "#holds/source.ts";
import type { HoldsView } from "#holds/views.ts";

const MINUTE = 60_000;

export const holds: HoldsView = {
	queues: [
		{
			kind: "dispatch",
			waiting: [
				{
					id: "piece-sound-the-shallows",
					mail: null,
					title: "Sound the shallows",
					voyage: "Chart the reef",
					waitedMillis: 4 * MINUTE,
				},
				{
					id: "piece-mark-the-channel",
					mail: null,
					title: "Mark the channel",
					voyage: "Chart the reef",
					waitedMillis: 21 * MINUTE,
				},
			],
		},
		{
			kind: "wake",
			waiting: [
				{
					id: "session-quartermaster",
					mail: { count: 3, precedence: "priority" },
					title: "quartermaster",
					voyage: "Chart the reef",
					waitedMillis: 9 * MINUTE,
				},
			],
		},
	],
};

export const holdFixture = (feeds: FixtureFeeds) => Layer.succeed(HoldSource, { holdsFeed: feeds.holds });
