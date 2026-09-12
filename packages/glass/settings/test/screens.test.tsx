import { labelled, named, settle, submit, until, write } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import { Option, Stream } from "effect";
import { Settings } from "#settings.tsx";

it.glass("renders settings", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* until(() => container.querySelectorAll("form").length === 9);
	const flags = Option.getOrThrow(yield* api.settings.flags({}).pipe(Stream.runHead));
	const counts = Option.getOrThrow(yield* api.settings.counts({}).pipe(Stream.runHead));
	const readings = [...flags, ...counts];
	expect([...container.querySelectorAll("form")].map(named)).toEqual(readings.map((reading) => reading.title));
	for (const reading of readings) {
		expect(container.textContent).toContain(reading.description);
	}
});

it.glass("saves a flag", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* until(() => container.querySelectorAll("form").length === 9);
	expect(labelled<HTMLInputElement>(container, "Hold everything On").type).toBe("checkbox");
	yield* settle(() => labelled<HTMLInputElement>(container, "Hold everything On").click());
	yield* submit(container, 2);
	const saved = yield* api.settings.flags({}).pipe(
		Stream.filter((flags) => flags.some((flag) => flag.key === "holdEverything" && flag.on)),
		Stream.runHead,
	);
	expect(Option.getOrThrow(saved).find((flag) => flag.key === "holdEverything")?.on).toBe(true);
});

it.glass("replaces a saved count", function* ({ api, render }) {
	yield* api.settings.setCount({ count: 9, key: "maxParallelSessions" });
	const container = yield* render(<Settings api={api} />);
	yield* until(() => container.querySelector<HTMLInputElement>('[aria-label="Maximum running agents Count"]')?.value === "9");
	expect(labelled<HTMLInputElement>(container, "Maximum running agents Count").type).toBe("number");
	yield* settle(() => write(labelled<HTMLInputElement>(container, "Maximum running agents Count"), "12"));
	yield* submit(container, 5);
	const saved = yield* api.settings.counts({}).pipe(
		Stream.filter((counts) => counts.some((count) => count.key === "maxParallelSessions" && count.count === 12)),
		Stream.runHead,
	);
	expect(Option.getOrThrow(saved).find((count) => count.key === "maxParallelSessions")?.count).toBe(12);
});

it.glass("rejects an out-of-range count", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* until(() => container.querySelectorAll("form").length === 9);
	const field = labelled<HTMLInputElement>(container, "Maximum running agents Count");
	yield* settle(() => write(field, "100"));
	yield* submit(container, 5);
	yield* until(() => field.getAttribute("aria-invalid") === "true");
	expect(container.textContent).toContain("Maximum running agents takes a whole number from 1 to 64");
});

it.glass("refreshes after a command", function* ({ api, render }) {
	const container = yield* render(<Settings api={api} />);
	yield* until(() => container.querySelectorAll("form").length === 9);
	yield* api.settings.setCount({ count: 13, key: "maxParallelSessions" });
	yield* until(() => labelled<HTMLInputElement>(container, "Maximum running agents Count").value === "13");
});
