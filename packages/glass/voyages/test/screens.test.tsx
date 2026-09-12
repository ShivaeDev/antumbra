import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { fill, form, labelled, renderedForm, submit, until, write } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { OpenVoyage } from "#open-voyage.tsx";

it.glass("renders voyage fields", function* ({ api, render }) {
	const container = yield* render(<OpenVoyage api={api} onOpened={() => undefined} />);
	const opening = yield* renderedForm(container, "Open voyage");
	expect([...opening.querySelectorAll("div > span[aria-hidden]")].map((title) => title.textContent)).toEqual([
		"Name",
		"North star",
		"Context",
		"Captain backend",
		"Captain model",
		"Captain effort",
		"Crew backend",
		"Crew model",
		"Crew effort",
	]);
	expect(labelled(opening, "Open voyage Context").tagName).toBe("TEXTAREA");
	expect(opening.querySelector('[aria-label="Open voyage Kind"]')).toBeNull();
});

it.glass("rejects a blank name", function* ({ api, render }) {
	const container = yield* render(<OpenVoyage api={api} onOpened={() => undefined} />);
	const opening = yield* renderedForm(container, "Open voyage");
	const name = labelled<HTMLInputElement>(opening, "Open voyage Name");
	yield* write(name, "   ");
	yield* submit(container, "Open voyage");
	yield* until(() => name.getAttribute("aria-invalid") === "true", "the name field to show its validation error");
	expect(container.textContent).toContain("A voyage needs a name");
	expect(name.value).toBe("   ");
	expect(yield* answered(api.voyages.list({}))).toMatchObject([{ kind: "flagship" }]);
});

it.glass("opens a voyage and resets the form", function* ({ api, render }) {
	let opened = 0;
	const container = yield* render(
		<OpenVoyage
			api={api}
			onOpened={() => {
				opened += 1;
			}}
		/>,
	);
	const opening = yield* renderedForm(container, "Open voyage");
	yield* fill(opening, "Open voyage Name", "Chart the reef");
	yield* fill(opening, "Open voyage North star", "every shoal is known");
	yield* fill(opening, "Open voyage Context", "the reef\nis uncharted");
	yield* submit(container, "Open voyage");
	const saved = yield* eventually(api.voyages.list({}), (rows) => rows.length > 1);
	expect(saved).toMatchObject([
		{ kind: "flagship" },
		{
			context: "the reef\nis uncharted",
			kind: "voyage",
			name: "Chart the reef",
			northStar: "every shoal is known",
		},
	]);
	yield* until(
		() => labelled<HTMLInputElement>(form(container, "Open voyage"), "Open voyage Name").value === "",
		"the voyage name to clear after opening",
	);
	expect(labelled<HTMLTextAreaElement>(form(container, "Open voyage"), "Open voyage Context").value).toBe("");
	expect(opened).toBe(1);
});
