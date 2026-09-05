import { AgentDomain } from "@antumbra/domain";
import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import type { ScriptedBackend } from "@antumbra/testing-runtime";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";

const terminalStatus = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow), Effect.orDie);

const settled = (intentId: string) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		expect(yield* terminalStatus(kernel.changes(intentId))).toBe("succeeded");
	});

const chosenBy = (scripted: ScriptedBackend) =>
	Effect.map(scripted.opened, (sessions) =>
		sessions.map((options) => ({ effort: Option.getOrNull(options.effort), model: Option.getOrNull(options.model) })),
	);

const openReef = (settings: { readonly crewEffort?: string; readonly crewModel?: string }) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		return yield* domain.voyages.open({
			backend: "scripted",
			captainEffort: "high",
			captainModel: "opus",
			context: "the reef is uncharted",
			name: "Chart the reef",
			northStar: "every shoal is known",
			...settings,
		});
	}).pipe(Effect.orDie);

const crewSounding = (voyageId: string, title: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const pieces = yield* Pieces;
		const piece = yield* pieces.charter({
			charter: "sound the eastern shoal",
			dependsOn: [],
			expectation: "the soundings are landed",
			role: "hand",
			title,
			voyageId,
		});
		yield* settled((yield* domain.voyages.workNow(piece.id)).intentId);
	}).pipe(Effect.orDie);

const hailed = (voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		yield* settled((yield* domain.voyages.hail(voyageId)).intentId);
	}).pipe(Effect.orDie);

const settingsChanged = (voyageId: string, model: string, effort: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		yield* domain.voyages.setAgentSettings(voyageId, "crew", { effort, model });
	}).pipe(Effect.orDie);

it.effectApp("a voyage's model and effort reach the sessions its agents open", { clock: "live" }, function* ({ scripted }) {
	const voyage = yield* openReef({ crewEffort: "low", crewModel: "haiku" });
	yield* hailed(voyage.id);
	yield* crewSounding(voyage.id, "Sound the east");

	expect(yield* chosenBy(scripted)).toEqual([
		{ effort: "high", model: "opus" },
		{ effort: "low", model: "haiku" },
	]);
});

it.effectApp("a later change reaches the next session and leaves an open one as it sailed", { clock: "live" }, function* ({ scripted }) {
	const voyage = yield* openReef({ crewEffort: "low", crewModel: "haiku" });
	yield* crewSounding(voyage.id, "Sound the east");
	yield* settingsChanged(voyage.id, "opus", "high");
	yield* crewSounding(voyage.id, "Sound the west");

	expect(yield* chosenBy(scripted)).toEqual([
		{ effort: "low", model: "haiku" },
		{ effort: "high", model: "opus" },
	]);
});
