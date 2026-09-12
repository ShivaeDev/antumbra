import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { click, fill, form, labelled, named, renderedForm, submit, until, write } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Settings } from "#settings.tsx";

it.glass("renders settings", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* renderedForm(container, "Hold everything");
	yield* renderedForm(container, "Maximum running agents");
	const flags = yield* answered(api.settings.flags({}));
	const counts = yield* answered(api.settings.counts({}));
	const readings = [...flags, ...counts];
	expect([...container.querySelectorAll("form")].map(named)).toEqual(readings.map((reading) => reading.title));
	for (const reading of readings) {
		expect(container.textContent).toContain(reading.description);
	}
});

it.glass("saves a flag", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	const holding = yield* renderedForm(container, "Hold everything");
	expect(labelled<HTMLInputElement>(holding, "Hold everything On").type).toBe("checkbox");
	yield* click(labelled<HTMLInputElement>(holding, "Hold everything On"));
	yield* submit(container, "Hold everything");
	const saved = yield* eventually(api.settings.flags({}), (flags) => flags.some((flag) => flag.key === "holdEverything" && flag.on));
	expect(saved.find((flag) => flag.key === "holdEverything")?.on).toBe(true);
});

it.glass("replaces a saved count", function* ({ api, render }) {
	yield* api.settings.setCount({ count: 9, key: "maxParallelSessions" });
	const container = yield* render(<Settings api={api} />);
	const running = yield* renderedForm(container, "Maximum running agents");
	yield* until(() => labelled<HTMLInputElement>(running, "Maximum running agents Count").value === "9");
	expect(labelled<HTMLInputElement>(running, "Maximum running agents Count").type).toBe("number");
	yield* fill(running, "Maximum running agents Count", "12");
	yield* submit(container, "Maximum running agents");
	const saved = yield* eventually(api.settings.counts({}), (counts) =>
		counts.some((count) => count.key === "maxParallelSessions" && count.count === 12),
	);
	expect(saved.find((count) => count.key === "maxParallelSessions")?.count).toBe(12);
});

it.glass("rejects an out-of-range count", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	const running = yield* renderedForm(container, "Maximum running agents");
	const field = labelled<HTMLInputElement>(running, "Maximum running agents Count");
	yield* write(field, "100");
	yield* submit(container, "Maximum running agents");
	yield* until(() => field.getAttribute("aria-invalid") === "true");
	expect(container.textContent).toContain("Maximum running agents takes a whole number from 1 to 64");
});

it.glass("refreshes after a command", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* renderedForm(container, "Maximum running agents");
	yield* api.settings.setCount({ count: 13, key: "maxParallelSessions" });
	yield* until(() => labelled<HTMLInputElement>(form(container, "Maximum running agents"), "Maximum running agents Count").value === "13");
});
