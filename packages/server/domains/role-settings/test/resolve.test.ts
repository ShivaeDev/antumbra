import { answered, it } from "@antumbra/app-testing/entry.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { expect } from "vitest";
import { FLEET } from "#ids.ts";
import { reef, shallows } from "#test/kit.ts";

const [FIRST_BACKEND] = AGENT_BACKEND_TAGS;

const listed = { defaultEffort: "high", efforts: ["low", "high"], isDefault: true, model: "opus", name: "Opus" };

it.app("names the source of every field it resolves", function* (app) {
	const roles = app.api.roleSettings;
	yield* app.api.backends.listModels({ backend: FIRST_BACKEND, failure: null, models: [listed] });

	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toEqual({
		backend: { source: "backend", value: FIRST_BACKEND },
		effort: { source: "backend", value: "high" },
		model: { source: "backend", value: "opus" },
	});

	yield* roles.choose({ backend: "codex", effort: "medium", model: "gpt-5", role: "crew", scope: FLEET });
	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toEqual({
		backend: { source: "fleet", value: "codex" },
		effort: { source: "fleet", value: "medium" },
		model: { source: "fleet", value: "gpt-5" },
	});

	yield* roles.choose({ backend: null, effort: null, model: "gpt-5-codex", role: "crew", scope: reef });
	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toEqual({
		backend: { source: "fleet", value: "codex" },
		effort: { source: "fleet", value: "medium" },
		model: { source: "chosen", value: "gpt-5-codex" },
	});
});

it.app("resolves a fleet default from the backend it names rather than the fleet's first", function* (app) {
	const roles = app.api.roleSettings;
	yield* app.api.backends.listModels({ backend: "codex", failure: null, models: [{ ...listed, defaultEffort: null, model: "gpt-5" }] });
	yield* roles.choose({ backend: "codex", effort: null, model: null, role: "flagship", scope: FLEET });

	expect(yield* answered(roles.resolve({ role: "flagship", voyageId: null }))).toEqual({
		backend: { source: "chosen", value: "codex" },
		effort: { source: "backend", value: null },
		model: { source: "backend", value: "gpt-5" },
	});
});

it.app("drops inherited model and effort when the backend changes", function* (app) {
	const roles = app.api.roleSettings;
	yield* roles.choose({ backend: "codex", effort: "medium", model: "gpt-5", role: "crew", scope: FLEET });

	yield* roles.choose({ backend: "claude", effort: null, model: null, role: "crew", scope: reef });
	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toEqual({
		backend: { source: "chosen", value: "claude" },
		effort: { source: "backend", value: null },
		model: { source: "backend", value: null },
	});

	yield* roles.choose({ backend: "claude", effort: null, model: "opus", role: "crew", scope: reef });
	expect(yield* answered(roles.resolve({ role: "crew", voyageId: reef }))).toMatchObject({ model: { source: "chosen", value: "opus" } });
});

it.app("resolves settings within their scope", function* (app) {
	const roles = app.api.roleSettings;
	yield* roles.choose({ backend: "codex", effort: null, model: null, role: "flagship", scope: FLEET });
	yield* roles.choose({ backend: "claude", effort: null, model: null, role: "captain", scope: reef });

	expect(yield* answered(roles.resolve({ role: "captain", voyageId: shallows }))).toMatchObject({
		backend: { source: "backend", value: FIRST_BACKEND },
	});
	expect(yield* answered(roles.forVoyage({ voyageId: reef }))).toMatchObject([
		{ backend: "claude", role: "captain", scope: reef },
		{ backend: null, role: "crew", scope: reef },
	]);
	expect(yield* answered(roles.forVoyage({ voyageId: shallows }))).toMatchObject([
		{ backend: null, role: "captain", scope: shallows },
		{ backend: null, role: "crew", scope: shallows },
	]);
});
