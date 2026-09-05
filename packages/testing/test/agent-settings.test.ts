import { VoyageProcedureService } from "@antumbra/domain/voyages/service";
import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Pieces } from "@antumbra/pieces";
import { RoleSettings } from "@antumbra/settings";
import { it } from "@antumbra/testing";
import type { ScriptedBackend } from "@antumbra/testing-runtime";
import { Voyages } from "@antumbra/voyages";
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

const openReef = (crew: { readonly effort: string | null; readonly model: string | null }) =>
	Effect.gen(function* () {
		const voyages = yield* Voyages;
		const roles = yield* RoleSettings;
		const voyage = yield* voyages.open({
			context: "the reef is uncharted",
			name: "Chart the reef",
			northStar: "every shoal is known",
		});
		yield* roles.changeForVoyage(voyage.id, "captain", { backend: "scripted", effort: "high", model: "opus" });
		yield* roles.changeForVoyage(voyage.id, "crew", { backend: "scripted", ...crew });
		return voyage;
	}).pipe(Effect.orDie);

const crewSounding = (voyageId: string, title: string) =>
	Effect.gen(function* () {
		const procedures = yield* VoyageProcedureService;
		const pieces = yield* Pieces;
		const piece = yield* pieces.charter({
			charter: "sound the eastern shoal",
			dependsOn: [],
			expectation: "the soundings are landed",
			role: "hand",
			title,
			voyageId,
		});
		yield* settled((yield* procedures.workNow(piece.id)).intentId);
	}).pipe(Effect.orDie);

const hailed = (voyageId: string) =>
	Effect.gen(function* () {
		const procedures = yield* VoyageProcedureService;
		yield* settled((yield* procedures.hail(voyageId)).intentId);
	}).pipe(Effect.orDie);

const settingsChanged = (voyageId: string, model: string, effort: string) =>
	Effect.gen(function* () {
		const roles = yield* RoleSettings;
		yield* roles.changeForVoyage(voyageId, "crew", { backend: "scripted", effort, model });
	}).pipe(Effect.orDie);

it.effectApp("a voyage's model and effort reach the sessions its agents open", { clock: "live" }, function* ({ scripted }) {
	const voyage = yield* openReef({ effort: "low", model: "haiku" });
	yield* hailed(voyage.id);
	yield* crewSounding(voyage.id, "Sound the east");

	expect(yield* chosenBy(scripted)).toEqual([
		{ effort: "high", model: "opus" },
		{ effort: "low", model: "haiku" },
	]);
});

it.effectApp("a later change reaches the next session and leaves an open one as it sailed", { clock: "live" }, function* ({ scripted }) {
	const voyage = yield* openReef({ effort: "low", model: "haiku" });
	yield* crewSounding(voyage.id, "Sound the east");
	yield* settingsChanged(voyage.id, "opus", "high");
	yield* crewSounding(voyage.id, "Sound the west");

	expect(yield* chosenBy(scripted)).toEqual([
		{ effort: "low", model: "haiku" },
		{ effort: "high", model: "opus" },
	]);
});
