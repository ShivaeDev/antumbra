import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { fill, labelled, press, renderedControl, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { ReposDialog } from "#repos-dialog.tsx";

const adding = (): HTMLButtonElement | null => document.body.querySelector<HTMLButtonElement>('button[type="submit"]');

const registry = (container: HTMLElement, count: number) =>
	until(() => container.textContent?.includes(`Repositories ${count}`) === true, `the registry to count ${count} repositories`);

it.glass("adds and forgets repositories through the live registry", function* ({ api, render }) {
	const container = yield* render(<ReposDialog api={api} />);
	yield* registry(container, 0);
	yield* press(container, "Repositories 0");
	yield* renderedControl(document.body, "Source");
	expect(adding()).toHaveProperty("disabled", true);
	expect(labelled<HTMLInputElement>(document.body, "Default ref").value).toBe("main");
	yield* fill(document.body, "Source", "/reefs/one.git");
	yield* fill(document.body, "Default ref", "trunk");
	yield* press(document.body, "Add");
	const first = yield* eventually(api.repos.all({}), (rows) => rows.length === 1);
	yield* until(() => labelled<HTMLInputElement>(document.body, "Source").value === "", "the successful form to clear its source");
	expect(labelled<HTMLInputElement>(document.body, "Default ref").value).toBe("trunk");
	yield* registry(container, 1);
	yield* fill(document.body, "Source", "/reefs/one.git");
	yield* fill(document.body, "Default ref", "main");
	yield* press(document.body, "Add");
	const repeated = yield* eventually(api.repos.all({}), (rows) => rows[0]?.defaultRef === "main");
	expect(repeated[0]?.id).toBe(first[0]?.id);
	yield* press(document.body, "Forget");
	yield* until(() => document.body.textContent?.includes("No repositories yet.") === true, "the forgotten registration to leave the live registry");
	expect(yield* answered(api.repos.all({}))).toEqual([]);
});

it.glass("keeps refused input available for correction", function* ({ api, render }) {
	yield* api.repos.register({ source: "/reefs/Reef-Charts", defaultRef: "main" });
	const container = yield* render(<ReposDialog api={api} />);
	yield* registry(container, 1);
	yield* press(container, "Repositories 1");
	yield* renderedControl(document.body, "Source");
	yield* fill(document.body, "Source", "git@example.test:crew/reef-charts.git");
	yield* press(document.body, "Add");
	yield* until(
		() => labelled<HTMLInputElement>(document.body, "Source").getAttribute("aria-invalid") === "true",
		"the slug refusal to reach its source field",
	);
	expect(labelled<HTMLInputElement>(document.body, "Source").value).toBe("git@example.test:crew/reef-charts.git");
	expect(document.body.textContent).toContain("would berth as reef-charts");
	yield* fill(document.body, "Source", "/reefs/other");
	yield* press(document.body, "Add");
	expect(yield* eventually(api.repos.all({}), (rows) => rows.length === 2)).toHaveLength(2);
});
