import { Stream } from "effect";
import type { CostsView } from "#costs/views.ts";
import { costs } from "#fixtures/cost-source.ts";
import { flagshipSummary } from "#fixtures/flagship.ts";
import { fleet } from "#fixtures/fleet.ts";
import { holds } from "#fixtures/hold-source.ts";
import { openRulings, standingRulings } from "#fixtures/ruling.ts";
import { sessionJournal } from "#fixtures/transcript-resume.ts";
import { quayView, reefSummary, reefView } from "#fixtures/voyage.ts";
import type { Fleet } from "#fleet.ts";
import type { HoldsView } from "#holds/views.ts";
import type { QuayView } from "#quay-views.ts";
import type { OpenRulingsView, StandingRulingsView } from "#rulings/views.ts";
import type { SessionEvent } from "#sight.ts";
import type { VoyageSummary, VoyageView } from "#voyage-views.ts";

export interface FixtureFeeds {
	readonly costs: Stream.Stream<CostsView>;
	readonly events: Stream.Stream<SessionEvent>;
	readonly fleet: Stream.Stream<Fleet>;
	readonly holds: Stream.Stream<HoldsView>;
	readonly quay: Stream.Stream<QuayView>;
	readonly rulings: Stream.Stream<OpenRulingsView>;
	readonly standing: Stream.Stream<StandingRulingsView>;
	readonly voyage: Stream.Stream<VoyageView>;
	readonly voyages: Stream.Stream<ReadonlyArray<VoyageSummary>>;
}

export const staticFeeds: FixtureFeeds = {
	costs: Stream.make(costs),
	events: Stream.fromArray(sessionJournal),
	fleet: Stream.make(fleet),
	holds: Stream.make(holds),
	quay: Stream.make(quayView),
	rulings: Stream.make(openRulings),
	standing: Stream.make(standingRulings),
	voyage: Stream.make(reefView),
	voyages: Stream.make([flagshipSummary, reefSummary]),
};
