import { AgentDomain } from "@antumbra/domain";
import { type IntentStatus, isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";

const terminalStatus = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow), Effect.orDie);

const settled = (intentId: string) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		expect(yield* terminalStatus(kernel.changes(intentId))).toBe("succeeded");
	});

const chosen = (options: { readonly effort: Option.Option<string>; readonly model: Option.Option<string> }) => ({
	effort: Option.getOrNull(options.effort),
	model: Option.getOrNull(options.model),
});

const soundings = (voyageId: string, title: string) =>
	Effect.flatMap(Pieces, (pieces) =>
		pieces.charter({
			charter: "sound the eastern shoal",
			dependsOn: [],
			expectation: "the soundings are landed",
			role: "hand",
			title,
			voyageId,
		}),
	);

it.effectApp("a voyage's model and effort reach the sessions its agents open", { clock: "live" }, function* ({ scripted }) {
	const domain = yield* AgentDomain;
	const voyage = yield* domain.voyages.open({
		backend: "scripted",
		captainEffort: "high",
		captainModel: "opus",
		context: "the reef is uncharted",
		crewEffort: "low",
		crewModel: "haiku",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	yield* settled((yield* domain.voyages.hail(voyage.id)).intentId);
	const piece = yield* soundings(voyage.id, "Sound the east");
	yield* settled((yield* domain.voyages.workNow(piece.id)).intentId);

	expect((yield* scripted.opened).map(chosen)).toEqual([
		{ effort: "high", model: "opus" },
		{ effort: "low", model: "haiku" },
	]);
});

it.effectApp("a later change reaches the next session and leaves an open one as it sailed", { clock: "live" }, function* ({ scripted }) {
	const domain = yield* AgentDomain;
	const voyage = yield* domain.voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		crewEffort: "low",
		crewModel: "haiku",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	const first = yield* soundings(voyage.id, "Sound the east");
	yield* settled((yield* domain.voyages.workNow(first.id)).intentId);

	yield* domain.voyages.setAgentSettings(voyage.id, "crew", { effort: "high", model: "opus" });
	const second = yield* soundings(voyage.id, "Sound the west");
	yield* settled((yield* domain.voyages.workNow(second.id)).intentId);

	expect((yield* scripted.opened).map(chosen)).toEqual([
		{ effort: "low", model: "haiku" },
		{ effort: "high", model: "opus" },
	]);
});
