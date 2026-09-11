// @vitest-environment happy-dom
import "#test/glass/setup.ts";
import { settings } from "@antumbra/domain-settings/feature.ts";
import { Settings } from "@antumbra/glass-settings/settings.tsx";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import type { ReactNode } from "react";
import { desk } from "#test/glass/desk.ts";
import { mount, settle, until, write } from "#test/glass/dom.ts";

const settingsDesk = () => desk([settings] as const);

const shown = (board: Effect.Success<ReturnType<typeof settingsDesk>>, screen: ReactNode) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(<board.glass.Provider>{screen}</board.glass.Provider>));
		yield* until(() => container.querySelectorAll("form").length > 0);
		return container;
	});

const labelled = <Element extends HTMLElement>(container: HTMLElement, label: string): Element =>
	container.querySelector<Element>(`[aria-label="${label}"]`) ?? Effect.runSync(Effect.die(`no control labelled ${label}`));

const named = (form: HTMLFormElement): string | null | undefined => document.getElementById(form.getAttribute("aria-labelledby") ?? "")?.textContent;

const saving = (container: HTMLElement, place: number) =>
	settle(() => [...container.querySelectorAll("form")][place]?.querySelector("button")?.click());

it.live("gives every flag and every count a form under the words the catalogue gives it and the sentence that says what it does", () =>
	Effect.gen(function* () {
		const board = yield* settingsDesk();
		const container = yield* shown(board, <Settings api={board.glass.api} />);
		yield* until(() => container.querySelectorAll("form").length === 9);
		const flags = Option.getOrThrow(yield* board.api.settings.flags({}).pipe(Stream.runHead));
		const counts = Option.getOrThrow(yield* board.api.settings.counts({}).pipe(Stream.runHead));
		const readings = [...flags, ...counts];
		expect([...container.querySelectorAll("form")].map(named)).toEqual(readings.map((reading) => reading.title));
		for (const reading of readings) {
			expect(container.textContent).toContain(reading.description);
		}
	}),
);

it.live("saves the flag that was switched", () =>
	Effect.gen(function* () {
		const board = yield* settingsDesk();
		const container = yield* shown(board, <Settings api={board.glass.api} />);
		yield* until(() => container.querySelectorAll("form").length === 9);
		yield* settle(() => labelled<HTMLInputElement>(container, "Hold everything On").click());
		yield* saving(container, 2);
		const saved = yield* board.api.settings.flags({}).pipe(
			Stream.filter((flags) => flags.some((flag) => flag.key === "holdEverything" && flag.on)),
			Stream.runHead,
		);
		expect(Option.getOrThrow(saved).find((flag) => flag.key === "holdEverything")?.on).toBe(true);
	}),
);

it.live("draws a saved count and commits the whole number that replaces it", () =>
	Effect.gen(function* () {
		const board = yield* settingsDesk();
		yield* board.api.settings.setCount({ count: 9, key: "maxParallelSessions" });
		const container = yield* shown(board, <Settings api={board.glass.api} />);
		yield* until(() => labelled<HTMLInputElement>(container, "Maximum running agents Count").value === "9");
		yield* settle(() => write(labelled<HTMLInputElement>(container, "Maximum running agents Count"), "12"));
		yield* saving(container, 5);
		const saved = yield* board.api.settings.counts({}).pipe(
			Stream.filter((counts) => counts.some((count) => count.key === "maxParallelSessions" && count.count === 12)),
			Stream.runHead,
		);
		expect(Option.getOrThrow(saved).find((count) => count.key === "maxParallelSessions")?.count).toBe(12);
	}),
);

it.live("puts a count the key does not allow on the field that carries it", () =>
	Effect.gen(function* () {
		const board = yield* settingsDesk();
		const container = yield* shown(board, <Settings api={board.glass.api} />);
		yield* until(() => container.querySelectorAll("form").length === 9);
		const field = labelled<HTMLInputElement>(container, "Maximum running agents Count");
		yield* settle(() => write(field, "100"));
		yield* saving(container, 5);
		yield* until(() => field.getAttribute("aria-invalid") === "true");
		expect(container.textContent).toContain("Maximum running agents takes a whole number from 1 to 64");
	}),
);

it.live("refreshes an open screen when a command changes a count", () =>
	Effect.gen(function* () {
		const board = yield* settingsDesk();
		const container = yield* shown(board, <Settings api={board.glass.api} />);
		yield* until(() => container.querySelectorAll("form").length === 9);
		yield* board.api.settings.setCount({ count: 13, key: "maxParallelSessions" });
		yield* until(() => labelled<HTMLInputElement>(container, "Maximum running agents Count").value === "13");
	}),
);
