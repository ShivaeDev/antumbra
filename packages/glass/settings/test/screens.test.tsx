import { expect, it } from "@effect/vitest";
import { Effect, SubscriptionRef } from "effect";
import type { ReactNode } from "react";
import { Settings } from "#settings.tsx";
import { type Desk, desk } from "#test/desk.ts";
import { mount, settle, until, write } from "#test/dom.ts";

const shown = (board: Desk, screen: ReactNode) =>
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
		const board = desk();
		const container = yield* shown(board, <Settings api={board.glass.api} />);
		yield* until(() => container.querySelectorAll("form").length === 9);
		expect([...container.querySelectorAll("form")].map(named)).toEqual([
			"Fold runs of tool calls",
			"Retire rested agents",
			"Hold everything",
			"Hold piece dispatch",
			"Hold wakes",
			"Maximum running agents",
			"Idle before siesta, in minutes",
			"Routine mail before a wake, in minutes",
			"Rest before retirement, in minutes",
		]);
		expect(container.textContent).toContain("Nothing Antumbra sends on its own goes out. Every queue keeps filling and running sessions carry on.");
		expect(container.textContent).toContain("How many agents may be running at once.");
	}),
);

it.live("sends the key of the flag that was switched", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <Settings api={board.glass.api} />);
		yield* until(() => container.querySelectorAll("form").length === 9);
		yield* settle(() => labelled<HTMLInputElement>(container, "Hold everything On").click());
		yield* saving(container, 2);
		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({ key: "holdEverything", on: true });
	}),
);

it.live("draws a count Antumbra holds and sends the whole number that replaces it", () =>
	Effect.gen(function* () {
		const board = desk();
		yield* SubscriptionRef.set(board.stored, new Map([["maxParallelSessions", 9]]));
		const container = yield* shown(board, <Settings api={board.glass.api} />);
		yield* until(() => labelled<HTMLInputElement>(container, "Maximum running agents Count").value === "9");
		yield* settle(() => write(labelled<HTMLInputElement>(container, "Maximum running agents Count"), "12"));
		yield* saving(container, 5);
		yield* until(() => board.sent.length === 1);
		expect(board.sent[0]).toMatchObject({ count: 12, key: "maxParallelSessions" });
	}),
);

it.live("puts a count the key does not allow on the field that carries it", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <Settings api={board.glass.api} />);
		yield* until(() => container.querySelectorAll("form").length === 9);
		const field = labelled<HTMLInputElement>(container, "Maximum running agents Count");
		yield* settle(() => write(field, "100"));
		yield* saving(container, 5);
		yield* until(() => field.getAttribute("aria-invalid") === "true");
		expect(container.textContent).toContain("Maximum running agents takes a whole number from 1 to 64");
	}),
);
