import { settle } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { expect } from "@effect/vitest";
import type { Effect } from "effect";
import { GlassContext } from "#adapters/glass.ts";
import { card, soundings } from "#test/piece-card-fixture.tsx";

const open = (container: HTMLElement): Effect.Effect<void> => settle(() => container.querySelector("button")?.click());

it.glass("reads the charter as the document it is once opened", function* ({ api, render }) {
	const container = yield* render(<GlassContext value={api}>{card(soundings)}</GlassContext>);

	yield* open(container);

	const shown = container.innerHTML;
	expect(shown).toContain("markdown");
	expect(shown).toContain("<h1>Sound the shoals</h1>");
	expect(shown).toContain("<strong>every</strong>");
	expect(shown).toContain("<code>three fathoms</code>");
	expect(container.textContent).toContain("Depends on: the chart");
	expect(container.textContent).toContain("Awaiting ruling ruling-1: which reef?");
	expect(container.textContent).toContain("Launch");
	expect(container.textContent).toContain("Board");
	expect(container.innerHTML).not.toContain("<h2>Log entry</h2>");
});

it.glass("exposes the piece log through the same collapsed Markdown control", function* ({ api, render }) {
	const container = yield* render(<GlassContext value={api}>{card(soundings)}</GlassContext>);
	yield* open(container);

	const board = container.querySelector<HTMLButtonElement>('button[title="Show the board"]');
	expect(board).not.toBeNull();
	yield* settle(() => board?.click());

	expect(container.innerHTML).toContain("<h2>Log entry</h2>");
	expect(container.innerHTML).toContain("<strong>two</strong>");
	expect(container.textContent).toContain("Write to the board");
});

it.glass("closes again on the reader's word", function* ({ api, render }) {
	const container = yield* render(<GlassContext value={api}>{card(soundings)}</GlassContext>);

	yield* open(container);
	yield* open(container);

	expect(container.innerHTML).not.toContain("<h1>");
	expect(container.textContent).not.toContain("Depends on");
});
