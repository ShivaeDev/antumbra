import { SettingsSource } from "@antumbra/contract";
import { defineIntentDemand } from "@antumbra/intent-demand";
import type { IntentKind } from "@antumbra/kernel";
import { SessionFabric } from "@antumbra/session-fabric";
import { LiveDelegations } from "@antumbra/sessions";
import { Clock, Effect } from "effect";
import { crewRest } from "#crew-rest.ts";
import { ExecutionSource } from "#execution/service.ts";
import { concludedPieces } from "#piece-state.ts";
import type { RetireFields } from "#retire.ts";

const MILLIS_PER_MINUTE = 60_000;

const sweptCrew = Effect.gen(function* () {
	const fabric = yield* SessionFabric;
	const live = yield* LiveDelegations;
	const settings = yield* SettingsSource;
	const source = yield* ExecutionSource;
	const { settings: chosen } = yield* settings.current;
	if (!chosen.retireSweep) {
		return [];
	}
	const world = yield* source.retirement();
	const runtime = {
		attached: yield* fabric.attached(),
		delegating: yield* live.delegating(),
	};
	const { resting, retirable } = crewRest(world, runtime);
	const now = yield* Clock.currentTimeMillis;
	const idleSince = yield* fabric.idleSince();
	const restedLongEnough = (sessionIds: ReadonlyArray<string>) =>
		sessionIds.every((sessionId) => {
			const since = idleSince.get(sessionId);
			return since !== undefined && now - since >= chosen.retireRestMinutes * MILLIS_PER_MINUTE;
		});
	const states = concludedPieces(world);
	const assignments = Map.groupBy(world.assignments, (assignment) => assignment.pieceId);
	const crewOf = (wanted: "done" | "abandoned") =>
		[...states].flatMap(([pieceId, state]) => (state === wanted ? (assignments.get(pieceId) ?? []).map((assignment) => assignment.agentId) : []));
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
		const source = yield* ExecutionSource;
		return [
			defineIntentDemand({
				eligible: sweptCrew.pipe(
					Effect.provideService(LiveDelegations, live),
					Effect.provideService(SessionFabric, fabric),
					Effect.provideService(SettingsSource, settings),
					Effect.provideService(ExecutionSource, source),
				),
				identify: ({ agentId }) => agentId,
				kind: retire,
			}),
		];
	});
