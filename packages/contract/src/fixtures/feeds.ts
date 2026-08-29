import { Stream } from "effect";
import { fleet } from "#fixtures/fleet.ts";
import { openRulings } from "#fixtures/ruling.ts";
import { storedEvents } from "#fixtures/transcript.ts";
import { quayView, reefSummary, reefView } from "#fixtures/voyage.ts";
import type { Fleet } from "#fleet.ts";
import type { QuayView } from "#quay-views.ts";
import type { OpenRulingsView } from "#rulings/views.ts";
import type { SessionEvent } from "#sight.ts";
import type { VoyageSummary, VoyageView } from "#voyage-views.ts";

// why: every live projection the window watches is one field here, so a
// fixture set can be swapped for a scripted one without a second stub layer
// drifting away from the first.
export interface FixtureFeeds {
	readonly events: Stream.Stream<SessionEvent>;
	readonly fleet: Stream.Stream<Fleet>;
	readonly quay: Stream.Stream<QuayView>;
	readonly rulings: Stream.Stream<OpenRulingsView>;
	readonly voyage: Stream.Stream<VoyageView>;
	readonly voyages: Stream.Stream<ReadonlyArray<VoyageSummary>>;
}

export const staticFeeds: FixtureFeeds = {
	events: Stream.fromArray(storedEvents),
	fleet: Stream.make(fleet),
	quay: Stream.make(quayView),
	rulings: Stream.make(openRulings),
	voyage: Stream.make(reefView),
	voyages: Stream.make([reefSummary]),
};
