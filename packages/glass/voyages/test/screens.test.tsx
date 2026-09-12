import { labelled, settle, submit, until, write } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Option, Stream } from "effect";
import { OpenVoyage } from "#open-voyage.tsx";

it.glass("renders voyage fields", function* ({ api, render }) {
	const container = yield* render(<OpenVoyage api={api} onOpened={() => undefined} />);
	yield* until(() => container.querySelectorAll("form").length === 1);
	expect([...container.querySelectorAll("div > span[aria-hidden]")].map((title) => title.textContent)).toEqual([
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
	expect(labelled(container, "Open voyage Context").tagName).toBe("TEXTAREA");
	expect(container.querySelector('[aria-label="Open voyage Kind"]')).toBeNull();
});

it.glass("rejects a blank name", function* ({ api, render }) {
	const container = yield* render(<OpenVoyage api={api} onOpened={() => undefined} />);
	yield* until(() => container.querySelectorAll("form").length === 1);
	const name = labelled<HTMLInputElement>(container, "Open voyage Name");
	yield* settle(() => write(name, "   "));
	yield* submit(container, 0);
	yield* until(() => name.getAttribute("aria-invalid") === "true");
	expect(container.textContent).toContain("A voyage needs a name");
	expect(name.value).toBe("   ");
	expect(Option.getOrThrow(yield* api.voyages.list({}).pipe(Stream.runHead))).toEqual([]);
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
	yield* until(() => container.querySelectorAll("form").length === 1);
	yield* settle(() => write(labelled<HTMLInputElement>(container, "Open voyage Name"), "Chart the reef"));
	yield* settle(() => write(labelled<HTMLInputElement>(container, "Open voyage North star"), "every shoal is known"));
	yield* settle(() => write(labelled<HTMLTextAreaElement>(container, "Open voyage Context"), "the reef\nis uncharted"));
	yield* submit(container, 0);
	const saved = yield* api.voyages.list({}).pipe(
		Stream.filter((rows) => rows.length > 0),
		Stream.runHead,
	);
	expect(Option.getOrThrow(saved)).toMatchObject([
		{
			context: "the reef\nis uncharted",
			kind: "voyage",
			name: "Chart the reef",
			northStar: "every shoal is known",
		},
	]);
	yield* until(() => labelled<HTMLInputElement>(container, "Open voyage Name").value === "");
	expect(labelled<HTMLTextAreaElement>(container, "Open voyage Context").value).toBe("");
	expect(opened).toBe(1);
});
