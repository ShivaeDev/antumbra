import { click, labelled, settle, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { expect } from "@effect/vitest";
import { crewed, NAME, opened, pieceId, screen } from "#test/kit.tsx";

const sized = (target: Element, width: number): ResizeObserverEntry => ({
	borderBoxSize: [],
	contentBoxSize: [],
	contentRect: new DOMRectReadOnly(0, 0, width, 0),
	devicePixelContentBoxSize: [],
	target,
});

const observing = (): ((width: number) => void) => {
	let announce: ((width: number) => void) | undefined;
	class Watcher implements ResizeObserver {
		readonly told: ResizeObserverCallback;
		constructor(told: ResizeObserverCallback) {
			this.told = told;
		}
		observe(target: Element): void {
			announce = (width) => this.told([sized(target, width)], this);
		}
		unobserve(): void {
			announce = undefined;
		}
		disconnect(): void {
			announce = undefined;
		}
	}
	Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: Watcher });
	return (width) => {
		if (announce !== undefined) announce(width);
	};
};

it.glass("gives an opened voyage the whole width until something is opened beside it", function* ({ api, render }) {
	yield* crewed(api);
	const container = yield* render(screen(api, opened, () => undefined));
	yield* until(() => container.textContent?.includes("Soundings") === true, "the voyage's pieces to reach the detail");
	expect(container.querySelector("output")).toBeNull();
	expect(container.querySelector('[aria-label="Resize the session"]')).toBeNull();
});

it.glass("a piece and a member of the crew take turns in the pane", function* ({ api, render }) {
	const crew = yield* crewed(api);
	const hand = crew.find((agent) => agent.role === "hand");
	const captain = crew.find((agent) => agent.role === "captain");
	if (hand === undefined || captain === undefined) return expect.fail("the voyage's crew");
	let place: ConsolePlace = opened;
	const remember = (next: ConsolePlace) => {
		place = next;
	};
	const container = yield* render(screen(api, place, remember));
	const crewRow = `Open captain ${captain.id}`;
	yield* until(() => container.querySelector(`[aria-label="${crewRow}"]`) !== null, "the captain's row in the crew list");
	yield* click(labelled(container, crewRow));
	yield* until(() => container.querySelector("output")?.textContent === captain.currentSessionId, "the captain's conversation in the pane");
	expect(place.pieceId).toBeNull();

	yield* click(labelled(container, "Open Soundings"));
	expect(place.pieceId).toBe(pieceId);
	yield* render(screen(api, place, remember));
	yield* until(() => container.querySelector("output")?.textContent === hand.currentSessionId, "the piece's conversation in the pane");

	yield* click(labelled(container, crewRow));
	expect(place.pieceId).toBeNull();
	yield* render(screen(api, place, remember));
	yield* until(() => container.querySelector("output")?.textContent === captain.currentSessionId, "the captain's conversation again");
});

it.glass("shows the pane alone below the detail's floor and gives the detail back when it closes", function* ({ api, render }) {
	const crew = yield* crewed(api);
	const hand = crew.find((agent) => agent.role === "hand");
	if (hand === undefined) return expect.fail("the piece's hand");
	const resize = observing();
	let place: ConsolePlace = { ...opened, pieceId };
	const remember = (next: ConsolePlace) => {
		place = next;
	};
	const container = yield* render(screen(api, place, remember));
	yield* until(() => container.querySelector("output")?.textContent === hand.currentSessionId, "the piece's conversation in the pane");
	yield* settle(() => resize(881));
	expect(container.textContent).toContain(NAME);

	yield* settle(() => resize(880));
	expect(container.textContent).not.toContain("Soundings");
	expect(container.querySelector("output")?.textContent).toBe(hand.currentSessionId);
	expect(container.querySelector('[aria-label="Resize the session"]')).toBeNull();

	yield* render(screen(api, { ...place, pieceId: null }, remember));
	yield* until(() => container.textContent?.includes("Soundings") === true, "the detail to take the width back");
});

it.glass("keeps the voyage title on one line with the whole title in its tooltip", function* ({ api, render }) {
	yield* crewed(api);
	const container = yield* render(screen(api, opened, () => undefined));
	yield* until(() => container.querySelector("h1")?.textContent === NAME, "the voyage's own page header");
	const title = container.querySelector("h1");
	expect(title?.className).toContain("truncate");
	expect(title?.closest('[data-slot="tooltip-trigger"]')).not.toBeNull();
});
