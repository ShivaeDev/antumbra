import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { RoleSettings } from "@antumbra/settings";
import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend";
import { expect } from "@effect/vitest";
import { Effect, Layer } from "effect";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

const layer = RoleSettings.layer.pipe(Layer.provideMerge(DomainFeedsLive));

it.effectDB("resolves a role from the voyage, then the fleet, then the backend that comes first", function* () {
	yield* Effect.gen(function* () {
		const roles = yield* RoleSettings;
		expect(yield* roles.resolve("voyage-reef", "crew")).toEqual({ backend: FIRST_BACKEND });

		yield* roles.changeDefault("crew", { backend: "codex", effort: "medium", model: "gpt-5" });
		expect(yield* roles.resolve("voyage-reef", "crew")).toEqual({ backend: "codex", effort: "medium", model: "gpt-5" });

		yield* roles.changeForVoyage("voyage-reef", "crew", { backend: null, effort: null, model: "opus" });
		expect(yield* roles.resolve("voyage-reef", "crew")).toEqual({ backend: "codex", effort: "medium", model: "opus" });
	}).pipe(Effect.provide(layer));
});

it.effectDB("leaves the fleet's model and effort behind when a voyage sails a role on another backend", function* () {
	yield* Effect.gen(function* () {
		const roles = yield* RoleSettings;
		yield* roles.changeDefault("crew", { backend: "codex", effort: "medium", model: "gpt-5" });

		yield* roles.changeForVoyage("voyage-reef", "crew", { backend: "claude", effort: null, model: null });
		expect(yield* roles.resolve("voyage-reef", "crew")).toEqual({ backend: "claude" });

		yield* roles.changeForVoyage("voyage-reef", "crew", { backend: "claude", effort: null, model: "opus" });
		expect(yield* roles.resolve("voyage-reef", "crew")).toEqual({ backend: "claude", model: "opus" });
	}).pipe(Effect.provide(layer));
});

it.effectDB("keeps each voyage's settings to itself and the flagship's to the fleet", function* () {
	yield* Effect.gen(function* () {
		const roles = yield* RoleSettings;
		yield* roles.changeDefault("flagship", { backend: "codex", effort: null, model: null });
		yield* roles.changeForVoyage("voyage-reef", "captain", { backend: "claude", effort: null, model: null });

		expect(yield* roles.resolve(null, "flagship")).toEqual({ backend: "codex" });
		expect(yield* roles.resolve("voyage-shallows", "captain")).toEqual({ backend: FIRST_BACKEND });
		expect(yield* roles.forVoyages(["voyage-reef", "voyage-shallows"])).toEqual(
			new Map([
				["voyage-reef", { captain: { backend: "claude", effort: null, model: null }, crew: { backend: null, effort: null, model: null } }],
				["voyage-shallows", { captain: { backend: null, effort: null, model: null }, crew: { backend: null, effort: null, model: null } }],
			]),
		);
	}).pipe(Effect.provide(layer));
});

it.effectDB("names every role in the fleet's defaults, chosen or not", function* () {
	yield* Effect.gen(function* () {
		const roles = yield* RoleSettings;
		yield* roles.changeDefault("captain", { backend: "claude", effort: "high", model: null });

		expect(yield* roles.defaults()).toEqual([
			{ backend: null, effort: null, model: null, role: "flagship" },
			{ backend: "claude", effort: "high", model: null, role: "captain" },
			{ backend: null, effort: null, model: null, role: "crew" },
			{ backend: null, effort: null, model: null, role: "smoother" },
		]);
	}).pipe(Effect.provide(layer));
});
