import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { fill, labelled, press, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { ReposDialog } from "#repos-dialog.tsx";

it.glass("adds and forgets repositories through the live registry", function* ({ api, render }) {
	const container = yield* render(<ReposDialog api={api} />);
	yield* until(() => container.querySelector("dialog") !== null, "the repository registry to arrive");
	yield* press(container, "Repositories 0");
	const adding = yield* renderedForm(container, "Add repository");
	expect(adding.querySelector('button[type="submit"]')).toHaveProperty("disabled", true);
	expect(labelled<HTMLInputElement>(adding, "Add repository Default ref").value).toBe("main");
	yield* fill(adding, "Add repository Source", "/reefs/one.git");
	yield* fill(adding, "Add repository Default ref", "trunk");
	yield* submit(container, "Add repository");
	const first = yield* eventually(api.repos.all({}), (rows) => rows.length === 1);
	yield* until(() => labelled<HTMLInputElement>(adding, "Add repository Source").value === "", "the successful form to clear its source");
	expect(labelled<HTMLInputElement>(adding, "Add repository Default ref").value).toBe("trunk");
	expect(container.textContent).toContain("Repositories 1");
	yield* fill(adding, "Add repository Source", "/reefs/one.git");
	yield* fill(adding, "Add repository Default ref", "main");
	yield* submit(container, "Add repository");
	const repeated = yield* eventually(api.repos.all({}), (rows) => rows[0]?.defaultRef === "main");
	expect(repeated[0]?.id).toBe(first[0]?.id);
	yield* press(container, "Forget");
	yield* until(() => container.textContent?.includes("no repositories yet") === true, "the forgotten registration to leave the live registry");
	expect(yield* answered(api.repos.all({}))).toEqual([]);
});

it.glass("keeps refused input available for correction", function* ({ api, render }) {
	yield* api.repos.register({ source: "/reefs/Reef-Charts", defaultRef: "main" });
	const container = yield* render(<ReposDialog api={api} />);
	const adding = yield* renderedForm(container, "Add repository");
	yield* fill(adding, "Add repository Source", "git@example.test:crew/reef-charts.git");
	yield* submit(container, "Add repository");
	yield* until(
		() => labelled<HTMLInputElement>(adding, "Add repository Source").getAttribute("aria-invalid") === "true",
		"the slug refusal to reach its source field",
	);
	expect(labelled<HTMLInputElement>(adding, "Add repository Source").value).toBe("git@example.test:crew/reef-charts.git");
	expect(container.textContent).toContain("would berth as reef-charts");
	yield* fill(adding, "Add repository Source", "/reefs/other");
	yield* submit(container, "Add repository");
	expect(yield* eventually(api.repos.all({}), (rows) => rows.length === 2)).toHaveLength(2);
});
