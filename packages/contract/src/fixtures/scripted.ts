import { type Duration, Effect, Stream } from "effect";
import { costs } from "#fixtures/cost-source.ts";
import type { FixtureFeeds } from "#fixtures/feeds.ts";
import { flagshipSummary } from "#fixtures/flagship.ts";
import { fleet } from "#fixtures/fleet.ts";
import { holds } from "#fixtures/hold-source.ts";
import { openRulings, standingRulings } from "#fixtures/ruling.ts";
import {
	grownStanding,
	proclaimedStanding,
	ruledRulings,
	staleStanding,
	supersededStanding,
	urgentRulings,
	withdrawnStanding,
} from "#fixtures/scripted-rulings.ts";
import {
	answeredReef,
	checkingQuay,
	crewedFleet,
	landedQuay,
	mooredFleet,
	shallowsSummary,
	workingReef,
	workingSummary,
} from "#fixtures/scripted-turns.ts";
import { storedEvents } from "#fixtures/transcript.ts";
import { cachedTurnEvents, closingEvent, laterEvent, restingEvent, wokenEvents } from "#fixtures/transcript-resume.ts";
import { quayView, reefSummary, reefView } from "#fixtures/voyage.ts";
import type { VoyageSummary } from "#voyage-views.ts";

const WATCHABLE_BEAT = "1500 millis";

const paced =
	(beat: Duration.Input) =>
	<A>(opening: Stream.Stream<A>, ...rest: readonly A[]): Stream.Stream<A> =>
		rest.reduce<Stream.Stream<A>>((stream, value) => Stream.concat(stream, Stream.fromEffect(Effect.as(Effect.sleep(beat), value))), opening);

export const makeScriptedFeeds = (beat: Duration.Input): FixtureFeeds => {
	const step = paced(beat);
	return {
		costs: Stream.make(costs),
		events: step(Stream.fromArray(storedEvents), ...wokenEvents, laterEvent, ...cachedTurnEvents, closingEvent, restingEvent),
		fleet: step(Stream.make(fleet), crewedFleet, mooredFleet),
		holds: Stream.make(holds),
		quay: step(Stream.make(quayView), checkingQuay, landedQuay),
		rulings: step(Stream.make(openRulings), urgentRulings, ruledRulings),
		standing: step(Stream.make(standingRulings), grownStanding, supersededStanding, proclaimedStanding, staleStanding, withdrawnStanding),
		voyage: step(Stream.make(reefView), answeredReef, workingReef),
		voyages: step<ReadonlyArray<VoyageSummary>>(
			Stream.make([flagshipSummary, reefSummary]),
			[flagshipSummary, workingSummary],
			[flagshipSummary, workingSummary, shallowsSummary],
		),
	};
};

export const scriptedFeeds: FixtureFeeds = makeScriptedFeeds(WATCHABLE_BEAT);
