import { SettingsSource } from "@antumbra/contract";
import { defineIntentDemand } from "@antumbra/intent-demand";
import type { IntentKind } from "@antumbra/kernel";
import { SessionFabric } from "@antumbra/session-fabric";
import { Clock, Effect } from "effect";
import { claimedCrew, restingCrew } from "#crew-rest.ts";
import { donePieces } from "#piece-state.ts";
import type { RetireFields } from "#retire.ts";
import { LiveDelegations } from "#session-tree-live.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

const MILLIS_PER_MINUTE = 60_000;

// why: a crew's own farewell trails the moment its work landed — the board
// note and the stand down come after the last outcome, not with it — so
// retiring on the done edge itself would behead every finished crew
// mid-sentence. The wait is what makes the sweep an undertaker rather than an
// executioner, and how long it waits is the admiral's to say.
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
	const resting = restingCrew(world, {
		attached: yield* fabric.attached,
		delegating: yield* live.delegating,
	});
	// why: the clock and the marks are read once per pass, so every Agent in it
	// is judged against the same moment.
	const now = yield* Clock.currentTimeMillis;
	const idleSince = yield* fabric.idleSince;
	const restedLongEnough = (sessionIds: ReadonlyArray<string>) =>
		sessionIds.every((sessionId) => {
			const since = idleSince.get(sessionId);
			return (
				since !== undefined &&
				now - since >= chosen.retireRestMinutes * MILLIS_PER_MINUTE
			);
		});
	// why: one Agent may hold claims on two landed pieces, and the demand it
	// stands for is the same demand twice — a set is what keeps a single pass
	// from asking to retire it once per claim.
	const crew = new Set(
		[...donePieces(world)].flatMap((pieceId) => claimedCrew(world, pieceId)),
	);
	return [...crew].flatMap((agentId) => {
		const rested = resting.get(agentId);
		return rested !== undefined && restedLongEnough(rested)
			? [{ agentId } satisfies RetireFields]
			: [];
	});
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
