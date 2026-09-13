import { eventually } from "@antumbra/app-testing/answers.ts";
import { fill, labelled, pick, press, renderedControl, settle, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { SpawnDialog } from "#spawn-dialog.tsx";

const open = (): boolean => document.querySelector('[role="dialog"]') !== null;

it.glass("spawns an agent from the fields the command declares", function* ({ api, render }) {
	const container = yield* render(<SpawnDialog api={api} />);
	yield* press(container, "Spawn agent");
	yield* renderedControl(document.body, "Role");
	expect(document.body.textContent).not.toContain("Charter");
	expect(document.activeElement).toBe(labelled(document.body, "Role"));
	yield* fill(document.body, "Role", "navigator");
	yield* pick(document.body, "Backend", "codex");
	expect(labelled(document.body, "Backend").textContent).toBe("codex");
	yield* press(document.body, "Spawn");
	const roster = yield* eventually(api.agents.roster({}), (rows) => rows.length === 1);
	expect(roster[0]).toMatchObject({ role: "navigator", status: "spawning" });
	yield* until(() => !open(), "the spawn dialog to close");
});

it.glass("opens with the role empty and the crew's backend already chosen", function* ({ api, render }) {
	yield* api.roleSettings.choose({ backend: "codex", effort: null, model: null, role: "crew", scope: "fleet" });
	yield* api.backends.listModels({
		backend: "codex",
		failure: null,
		models: [{ defaultEffort: "high", efforts: ["low", "high"], isDefault: true, model: "gpt", name: "GPT" }],
	});
	const container = yield* render(<SpawnDialog api={api} />);
	yield* press(container, "Spawn agent");
	yield* renderedControl(document.body, "Backend");
	expect(labelled<HTMLInputElement>(document.body, "Model").placeholder).toBe("gpt · backend default");
	expect(labelled<HTMLInputElement>(document.body, "Effort").placeholder).toBe("high · backend default");
	expect(labelled(document.body, "Backend").textContent).toBe("codex");
	expect(labelled<HTMLInputElement>(document.body, "Role").value).toBe("");

	yield* pick(document.body, "Backend", "codex · backend default");
	yield* until(() => labelled(document.body, "Backend").textContent === "codex · backend default", "the backend to fall back to the crew's default");
});

it.glass("closes on Escape and on its X while the form is still empty", function* ({ api, render }) {
	const container = yield* render(<SpawnDialog api={api} />);
	yield* press(container, "Spawn agent");
	yield* renderedControl(document.body, "Role");
	yield* settle(() => document.body.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" })));
	yield* until(() => !open(), "Escape to close the spawn dialog");

	yield* press(container, "Spawn agent");
	yield* renderedControl(document.body, "Role");
	yield* press(document.body, "Close");
	yield* until(() => !open(), "the close button to close the spawn dialog");
});
