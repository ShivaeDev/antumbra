import { AGENT_BACKEND_TAGS } from "@antumbra/vocabulary/agent-backend.ts";
import { expect } from "vitest";
import { FLEET } from "#ids.ts";
import { answered, it, reef, shallows } from "#test/kit.ts";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

it.app("resolves a role from the voyage, then the fleet, then the backend that comes first", function* (app) {
	const roles = app.api.roleSettings;
	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toEqual({ backend: FIRST_BACKEND, effort: null, model: null });

	yield* roles.choose({ backend: "codex", effort: "medium", model: "gpt-5", role: "crew", scope: FLEET });
	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toEqual({ backend: "codex", effort: "medium", model: "gpt-5" });

	yield* roles.choose({ backend: null, effort: null, model: "opus", role: "crew", scope: reef });
	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toEqual({ backend: "codex", effort: "medium", model: "opus" });
});

it.app("leaves the fleet's model and effort behind when a voyage sails a role on another backend", function* (app) {
	const roles = app.api.roleSettings;
	yield* roles.choose({ backend: "codex", effort: "medium", model: "gpt-5", role: "crew", scope: FLEET });

	yield* roles.choose({ backend: "claude", effort: null, model: null, role: "crew", scope: reef });
	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toEqual({ backend: "claude", effort: null, model: null });

	yield* roles.choose({ backend: "claude", effort: null, model: "opus", role: "crew", scope: reef });
	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toEqual({ backend: "claude", effort: null, model: "opus" });
});

it.app("keeps each voyage's settings to itself and the flagship's to the fleet", function* (app) {
	const roles = app.api.roleSettings;
	yield* roles.choose({ backend: "codex", effort: null, model: null, role: "flagship", scope: FLEET });
	yield* roles.choose({ backend: "claude", effort: null, model: null, role: "captain", scope: reef });

	expect(yield* answered(roles.resolve({ role: "flagship", voyageId: null }))).toEqual({ backend: "codex", effort: null, model: null });
	expect(yield* answered(roles.resolve({ role: "captain", voyageId: shallows }))).toEqual({ backend: FIRST_BACKEND, effort: null, model: null });
	expect(yield* answered(roles.forVoyage({ voyageId: reef }))).toEqual([
		{ backend: "claude", effort: null, id: `${reef}/captain`, model: null, role: "captain", scope: reef },
		{ backend: null, effort: null, id: `${reef}/crew`, model: null, role: "crew", scope: reef },
	]);
	expect(yield* answered(roles.forVoyage({ voyageId: shallows }))).toEqual([
		{ backend: null, effort: null, id: `${shallows}/captain`, model: null, role: "captain", scope: shallows },
		{ backend: null, effort: null, id: `${shallows}/crew`, model: null, role: "crew", scope: shallows },
	]);
});
