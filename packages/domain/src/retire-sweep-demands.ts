import { SettingsSource } from "@antumbra/contract";
import { defineIntentDemand } from "@antumbra/intent-demand";
import type { IntentKind } from "@antumbra/kernel";
import { SessionFabric } from "@antumbra/session-fabric";
import { LiveDelegations } from "@antumbra/sessions";
import { Clock, Effect } from "effect";
import { claimedCrew, restingCrew, retirableCrew } from "#crew-rest.ts";
import { type PieceState, pieceStates } from "#piece-state.ts";
import type { RetireFields } from "#retire.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

const MILLIS_PER_MINUTE = 60_000;

// why: two settled states, on two clocks, because they carry different
// information. A crew's own farewell trails the moment its work landed — the
// board note and the stand down come after the last outcome, not with it — so
// retiring on the done edge would behead a finished crew mid-sentence, and the
// wait is what makes the sweep an undertaker rather than an executioner. A
// piece the admiral wrote off needs no such wait: the verdict is the order to
// clean up, and waiting an hour to obey it would only be hesitation.
const sweptCrew = Effect.gen(function* () {
	const fabric = yield* SessionFabric;
	const live = yield* LiveDelegations;
	const settings = yield* SettingsSource;
	const source = yield* VoyageWorldSource;
	// why: read through on every pass, the way the dispatcher reads its own
	// ceiling. A flag turned off or a threshold moved in the window is in force
	// on the next pass, with nothing to keep in step and nobody to tell.
	const { settings: chosen } = yield* settings.current;
	if (!chosen.retireSweep) {
		return [];
	}
	const world = yield* source.read;
	const runtime = {
		attached: yield* fabric.attached(),
		delegating: yield* live.delegating(),
	};
	const resting = restingCrew(world, runtime);
	const retirable = retirableCrew(world, runtime);
	// why: the clock and the marks are read once per pass, so every Agent in it
	// is judged against the same moment.
	const now = yield* Clock.currentTimeMillis;
	const idleSince = yield* fabric.idleSince();
	const restedLongEnough = (sessionIds: ReadonlyArray<string>) =>
		sessionIds.every((sessionId) => {
			const since = idleSince.get(sessionId);
			return (
				since !== undefined &&
				now - since >= chosen.retireRestMinutes * MILLIS_PER_MINUTE
			);
		});
	// why: selection is by the piece's own state, never by the tally underneath
	// it. Both verdicts count as landed outcomes, so a written-off piece answers
	// the done tally as readily as a delivered one, and the ladder is the only
	// place the two are told apart. Reading the state is what keeps this sweep
	// and the button from ever disagreeing about which pieces qualify.
	const states = pieceStates(world);
	const crewOf = (wanted: PieceState) =>
		[...states].flatMap(([pieceId, state]) =>
			state === wanted ? claimedCrew(world, pieceId) : [],
		);
	// why: work that landed is finished, but its crew is still saying so — the
	// farewell trails the last outcome — so the wait is what keeps the sweep
	// from beheading a crew mid-sentence.
	const landed = crewOf("done").filter((agentId) => {
		const rested = resting.get(agentId);
		return rested !== undefined && restedLongEnough(rested);
	});
	// why: no wait at all, because pressing abandon is itself the order to clean
	// up. A written-off piece carries that instruction; a change that merely
	// closed carries none — nothing in it says whether the work wants another
	// attempt or an ending — so such a piece waits out the threshold like any
	// other. Only a crew mid-word is left, and only until it stops.
	const writtenOff = crewOf("abandoned").filter((agentId) =>
		retirable.has(agentId),
	);
	// why: one Agent may hold claims on two settled pieces, and the demand it
	// stands for is the same demand twice — a set is what keeps a single pass
	// from asking to retire it once per claim.
	return [...new Set([...landed, ...writtenOff])].map(
		(agentId) => ({ agentId }) satisfies RetireFields,
	);
});

export const compileRetireSweepDemands = (retire: IntentKind<RetireFields>) =>
	Effect.gen(function* () {
		const fabric = yield* SessionFabric;
		const live = yield* LiveDelegations;
		const settings = yield* SettingsSource;
		const source = yield* VoyageWorldSource;
		return [
			defineIntentDemand({
				eligible: sweptCrew.pipe(
					Effect.provideService(LiveDelegations, live),
					Effect.provideService(SessionFabric, fabric),
					Effect.provideService(SettingsSource, settings),
					Effect.provideService(VoyageWorldSource, source),
				),
				identify: ({ agentId }) => agentId,
				kind: retire,
			}),
		];
	});
