import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { click, fill, labelled, renderedControl, submit, until, write } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Settings } from "#settings.tsx";

it.glass("renders every setting the fleet has", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	const flags = yield* answered(api.settings.flags({}));
	const counts = yield* answered(api.settings.counts({}));
	for (const reading of [...flags, ...counts]) {
		yield* renderedControl(container, reading.title);
		expect(container.textContent).toContain(reading.description);
	}
});

it.glass("says a count's unit beside its field instead of in its label", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* renderedControl(container, "Idle before siesta");
	expect(labelled(container, "Idle before siesta").parentElement?.textContent).toContain("min");
	expect(labelled(container, "Maximum running agents").parentElement?.textContent).not.toContain("min");
});

it.glass("saves a flag as it is switched", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* renderedControl(container, "Hold everything");
	yield* click(labelled(container, "Hold everything"));
	const saved = yield* eventually(api.settings.flags({}), (flags) => flags.some((flag) => flag.key === "holdEverything" && flag.on));
	expect(saved.find((flag) => flag.key === "holdEverything")?.on).toBe(true);
});

it.glass("replaces a saved count", function* ({ api, render }) {
	yield* api.settings.setCount({ count: 9, key: "maxParallelSessions" });
	const container = yield* render(<Settings api={api} />);
	yield* renderedControl(container, "Maximum running agents");
	yield* until(() => labelled<HTMLInputElement>(container, "Maximum running agents").value === "9", "the saved running-agent limit to show 9");
	expect(labelled<HTMLInputElement>(container, "Maximum running agents").type).toBe("number");
	yield* fill(container, "Maximum running agents", "12");
	yield* submit(container, "Maximum running agents");
	const saved = yield* eventually(api.settings.counts({}), (counts) =>
		counts.some((count) => count.key === "maxParallelSessions" && count.count === 12),
	);
	expect(saved.find((count) => count.key === "maxParallelSessions")?.count).toBe(12);
});

it.glass("rejects an out-of-range count", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* renderedControl(container, "Maximum running agents");
	const field = labelled<HTMLInputElement>(container, "Maximum running agents");
	yield* write(field, "100");
	yield* submit(container, "Maximum running agents");
	yield* until(() => field.getAttribute("aria-invalid") === "true", "the count field to show its validation error");
	expect(container.textContent).toContain("Maximum running agents takes a whole number from 1 to 64");
});

it.glass("refreshes after a command", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* renderedControl(container, "Maximum running agents");
	yield* api.settings.setCount({ count: 13, key: "maxParallelSessions" });
	yield* until(() => labelled<HTMLInputElement>(container, "Maximum running agents").value === "13", "the running-agent limit to refresh to 13");
});
