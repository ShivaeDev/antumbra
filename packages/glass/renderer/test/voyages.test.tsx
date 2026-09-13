import { click, labelled, press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { expect } from "@effect/vitest";
import { BARE, bare, CHARTER, crewed, listing, NAME, NORTH_STAR, screen, voyageId } from "#test/kit.tsx";

const heading = (container: HTMLElement, title: string): HTMLElement => {
	const found = [...container.querySelectorAll("h2")].find((candidate) => candidate.textContent === title);
	return found ?? expect.fail(`the ${title} heading`);
};

const trigger = (container: HTMLElement, title: string): HTMLElement => {
	const found = heading(container, title).closest('[data-slot="collapsible-trigger"]');
	return found instanceof HTMLElement ? found : expect.fail(`the ${title} heading to fold`);
};

it.glass("opens a voyage in the list's place and comes back to the list", function* ({ api, render }) {
	yield* crewed(api);
	let place: ConsolePlace = listing;
	const remember = (next: ConsolePlace) => {
		place = next;
	};
	const container = yield* render(screen(api, place, remember));
	yield* until(() => container.querySelector(`[aria-label="Open ${NAME}"]`) !== null, "the voyage list");
	expect(container.querySelector("h1")?.textContent).toBe("Voyages");

	yield* click(labelled(container, `Open ${NAME}`));
	expect(place.voyageId).toBe(voyageId);
	const detail = yield* render(screen(api, place, remember));
	yield* until(() => detail.querySelector("h1")?.textContent === NAME, "the voyage's own page header");
	expect(detail.querySelector(`[aria-label="Open ${NAME}"]`)).toBeNull();
	const header = detail.querySelector("header") ?? expect.fail("the voyage's page header");
	yield* until(() => header.textContent?.includes("a captain") === true, "the header's act on the captain");
	expect([...header.querySelectorAll("button")].at(-1)?.textContent).toContain("a captain");

	yield* click(labelled(detail, "Back"));
	expect(place.voyageId).toBeNull();
	yield* render(screen(api, place, remember));
	yield* until(() => container.querySelector("h1")?.textContent === "Voyages", "the list to take the place back");
});

it.glass("folds the voyage's prose and keeps the board open with its charter act", function* ({ api, render }) {
	yield* crewed(api);
	const container = yield* render(
		screen(api, { role: "console", mode: "voyages", changeId: null, pieceId: null, sessionId: null, voyageId }, () => undefined),
	);
	yield* until(() => container.textContent?.includes("Soundings") === true, "the voyage's pieces to reach the board");
	expect(container.textContent).not.toContain(NORTH_STAR);
	expect(container.textContent).not.toContain(CHARTER);

	yield* click(trigger(container, "North star"));
	yield* until(() => container.textContent?.includes(NORTH_STAR) === true, "the north star to unfold");
	yield* click(trigger(container, "Charter"));
	yield* until(() => container.textContent?.includes(CHARTER) === true, "the charter to unfold");

	const board = heading(container, "Board").closest("div");
	if (board === null) return expect.fail("the Board heading row");
	yield* press(board, "Charter piece");
	yield* until(() => document.querySelector('[role="dialog"]') !== null, "the chartering dialog");
});

it.glass("keeps the quiet chip clear of the act that wakes the captain", function* ({ api, render }) {
	yield* api.voyages.open(bare);
	const container = yield* render(screen(api, { ...listing, voyageId: BARE }, () => undefined));
	yield* until(() => container.querySelector("h1")?.textContent === "Sound the bar", "the bare voyage's header");
	const header = container.querySelector("header") ?? expect.fail("the page header");
	yield* until(() => header.textContent?.includes("quiet") === true, "the quiet chip");
	const chip = [...header.querySelectorAll('[data-slot="badge"]')].find((badge) => badge.textContent === "quiet");
	if (chip === undefined) return expect.fail("the quiet chip");
	expect(chip.closest("button")).toBeNull();
	const acts = [...header.querySelectorAll("button")];
	expect(acts).toHaveLength(3);
	expect(acts[0]?.getAttribute("aria-label")).toBe("Back");
	expect(acts[1]?.textContent).toBe("Quiet");
	expect(acts.at(-1)?.textContent).toBe("Hail a captain");
	expect(header.textContent).not.toContain("Wake the captain");
});

it.glass("quiets a voyage from its header and offers to resume it", function* ({ api, render }) {
	yield* api.voyages.open(bare);
	const container = yield* render(screen(api, { ...listing, voyageId: BARE }, () => undefined));
	yield* until(() => container.querySelector("h1")?.textContent === "Sound the bar", "the bare voyage's header");
	const header = container.querySelector("header") ?? expect.fail("the page header");
	yield* until(() => [...header.querySelectorAll("button")].some((act) => act.textContent === "Quiet"), "the quiet act");
	expect([...header.querySelectorAll("button")].at(-1)?.textContent).toBe("Hail a captain");

	yield* press(header, "Quiet");
	yield* until(() => [...header.querySelectorAll("button")].some((act) => act.textContent === "Resume"), "the resume act");
	expect([...header.querySelectorAll('[data-slot="badge"]')].map((chip) => chip.textContent)).toEqual(["quiet by you"]);
	expect(header.textContent).toContain("nothing is sent to it until you resume it");
	expect([...header.querySelectorAll("button")].at(-1)?.textContent).toBe("Hail a captain");
});
