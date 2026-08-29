import { type Duration, Effect, Stream } from "effect";
import type { FixtureFeeds } from "#fixtures/feeds.ts";
import { flagshipSummary } from "#fixtures/flagship.ts";
import { fleet } from "#fixtures/fleet.ts";
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
import {
	cachedTurnEvents,
	closingEvent,
	laterEvent,
	restingEvent,
	wokenEvents,
} from "#fixtures/transcript-resume.ts";
import { quayView, reefSummary, reefView } from "#fixtures/voyage.ts";
import type { VoyageSummary } from "#voyage-views.ts";

const WATCHABLE_BEAT = "1500 millis";

// why: a browser harness only proves a projection is live if the view changes
// after it first paints, so every scripted feed opens on the snapshot the
// static fixtures carry and then reworks it on a beat slow enough to watch.
const paced =
	(beat: Duration.Input) =>
	<A>(opening: Stream.Stream<A>, ...rest: readonly A[]): Stream.Stream<A> =>
		rest.reduce<Stream.Stream<A>>(
			(stream, value) =>
				Stream.concat(
					stream,
					Stream.fromEffect(Effect.as(Effect.sleep(beat), value)),
				),
			opening,
		);

export const makeScriptedFeeds = (beat: Duration.Input): FixtureFeeds => {
	const step = paced(beat);
	return {
		// why: the second half of this script is a resume — the session wakes,
		// picks up a background task, answers out of an almost entirely cached
		// context and settles again. It is the beat the usage split exists for,
		// so the harness shows it rather than only the first cold turn.
		events: step(
			Stream.fromArray(storedEvents),
			...wokenEvents,
			laterEvent,
			...cachedTurnEvents,
			closingEvent,
			restingEvent,
		),
		fleet: step(Stream.make(fleet), crewedFleet, mooredFleet),
		quay: step(Stream.make(quayView), checkingQuay, landedQuay),
		rulings: step(Stream.make(openRulings), urgentRulings, ruledRulings),
		standing: step(
			Stream.make(standingRulings),
			grownStanding,
			supersededStanding,
			proclaimedStanding,
			staleStanding,
			withdrawnStanding,
		),
		voyage: step(Stream.make(reefView), answeredReef, workingReef),
		voyages: step<ReadonlyArray<VoyageSummary>>(
			Stream.make([flagshipSummary, reefSummary]),
			[flagshipSummary, workingSummary],
			[flagshipSummary, workingSummary, shallowsSummary],
		),
	};
};

export const scriptedFeeds: FixtureFeeds = makeScriptedFeeds(WATCHABLE_BEAT);
