import { it } from "@antumbra/testing";
import { Voyages } from "@antumbra/voyages";
import { expect } from "@effect/vitest";

it.effectApp("reads each role's current choices and leaves cleared settings unchosen", function* () {
	const voyages = yield* Voyages;
	const voyage = yield* voyages.open({
		backend: "scripted",
		captainEffort: "high",
		captainModel: "opus",
		context: "the reef is uncharted",
		crewEffort: "low",
		crewModel: "haiku",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	expect(yield* voyages.readAgentSettings(voyage.id, "captain")).toEqual({ effort: "high", model: "opus" });
	expect(yield* voyages.readAgentSettings(voyage.id, "crew")).toEqual({ effort: "low", model: "haiku" });
	yield* voyages.setAgentSettings(voyage.id, "captain", { effort: null, model: "sonnet" });
	expect(yield* voyages.readAgentSettings(voyage.id, "captain")).toEqual({ model: "sonnet" });
	expect(yield* voyages.readAgentSettings(voyage.id, "crew")).toEqual({ effort: "low", model: "haiku" });
	yield* voyages.setAgentSettings(voyage.id, "crew", { effort: null, model: null });
	expect(yield* voyages.readAgentSettings(voyage.id, "crew")).toEqual({});
});
