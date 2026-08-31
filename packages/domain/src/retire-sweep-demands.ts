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

const sweptCrew = Effect.gen(function* () {
	const fabric = yield* SessionFabric;
	const live = yield* LiveDelegations;
	const settings = yield* SettingsSource;
	const source = yield* VoyageWorldSource;
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
	const now = yield* Clock.currentTimeMillis;
	const idleSince = yield* fabric.idleSince();
	const restedLongEnough = (sessionIds: ReadonlyArray<string>) =>
		sessionIds.every((sessionId) => {
			const since = idleSince.get(sessionId);
			return since !== undefined && now - since >= chosen.retireRestMinutes * MILLIS_PER_MINUTE;
		});
	const states = pieceStates(world);
	const crewOf = (wanted: PieceState) => [...states].flatMap(([pieceId, state]) => (state === wanted ? claimedCrew(world, pieceId) : []));
	const landed = crewOf("done").filter((agentId) => {
		const rested = resting.get(agentId);
		return rested !== undefined && restedLongEnough(rested);
	});
	const writtenOff = crewOf("abandoned").filter((agentId) => retirable.has(agentId));
	return [...new Set([...landed, ...writtenOff])].map((agentId) => ({ agentId }) satisfies RetireFields);
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
