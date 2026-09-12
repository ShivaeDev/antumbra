import { eventually } from "@antumbra/app-testing/answers.ts";
import { fill, press, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { VoyagesAside } from "#navigation/voyages-aside.tsx";

it.glass("opens a Voyage from navigation and selects its live list entry", function* ({ api, render }) {
	let selected = "";
	const container = yield* render(
		<VoyagesAside
			api={api}
			onHail={() => undefined}
			selected={undefined}
			onSelect={(id) => {
				selected = id;
			}}
		/>,
	);
	expect(document.querySelector('[role="dialog"]')).toBeNull();
	yield* press(container, "Open voyage");
	const opening = yield* renderedForm(document.body, "Open voyage");
	yield* fill(opening, "Open voyage Name", "Chart the reef");
	yield* fill(opening, "Open voyage North star", "Every shoal is known");
	yield* submit(document.body, "Open voyage");
	const voyages = yield* eventually(api.voyages.list({}), (rows) => rows.length === 1);
	expect(voyages[0]).toMatchObject({ kind: "voyage", name: "Chart the reef", northStar: "Every shoal is known" });
	yield* until(() => document.querySelector('[role="dialog"]') === null, "the successful opening to close its dialog");
	yield* until(() => container.textContent?.includes("Chart the reef") === true, "the new Voyage to appear in navigation");
	yield* press(container, "Chart the reef");
	expect(selected).toBe(voyages[0]?.id);
});
