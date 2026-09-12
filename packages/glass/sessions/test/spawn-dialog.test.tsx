import { eventually } from "@antumbra/app-testing/answers.ts";
import { fill, press, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { SpawnDialog } from "#spawn-dialog.tsx";

it.glass("spawns an agent from the fields the command declares", function* ({ api, render }) {
	const container = yield* render(<SpawnDialog api={api} />);
	yield* press(container, "Spawn agent");
	const form = yield* renderedForm(document.body, "Spawn agent");
	expect(form.textContent).not.toContain("Charter");
	yield* fill(form, "Spawn agent Role", "navigator");
	yield* fill(form, "Spawn agent Backend", "claude");
	yield* submit(document.body, "Spawn agent");
	const roster = yield* eventually(api.agents.roster({}), (rows) => rows.length === 1);
	expect(roster[0]).toMatchObject({ role: "navigator", status: "spawning" });
	yield* until(() => document.querySelector('[role="dialog"]') === null, "the spawn dialog to close");
});
