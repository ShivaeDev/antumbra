import { eventually } from "@antumbra/app-testing/answers.ts";
import { settle, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { expect } from "vitest";
import { FleetPanel } from "#fleet.tsx";
import { CREW, crewed, openGroup, smoothing, VOYAGE_NAME } from "#test/kit.ts";

const BRANCH = "work/1n4qp73rw6/antumbra";

const nowhere = { onPiece: () => undefined, onSession: () => undefined, onVoyage: () => undefined };

const groupsOf = (container: HTMLElement): readonly (readonly [string, string])[] =>
	[...container.querySelectorAll("h2")].map((heading) => [heading.textContent ?? "", heading.nextElementSibling?.textContent ?? ""]);

const spanSaying = (container: HTMLElement, words: string): HTMLElement | undefined =>
	[...container.querySelectorAll<HTMLElement>("span")].find((candidate) => candidate.textContent === words);

const buttonSaying = (container: HTMLElement, words: string): HTMLElement | undefined =>
	[...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === words);

it.glass("gives the list its own header band beside a session and leaves the group labels in the body", function* ({ api, render }) {
	yield* crewed(api);
	const container = yield* render(<FleetPanel {...nowhere} api={api} sessionId={identity(CREW).sessionId} />);
	yield* until(() => container.querySelector("h2") !== null, "the roster to reach the list");
	const band = container.querySelector("header");
	expect(band?.className).toContain("h-12");
	expect(band?.querySelector("h1")?.textContent).toBe("Fleet");
	expect(band?.textContent).toContain("Spawn agent");
	expect(band?.querySelector("h2")).toBeNull();
	expect(container.querySelector('[data-slot="scroll-area-viewport"]')?.querySelector("h2")).not.toBeNull();
	expect(container.textContent).not.toContain("Show smoothers");
});

it.glass("folds the smoothers into a group of their own that opens when the reader asks", function* ({ api, render }) {
	yield* crewed(api);
	yield* smoothing(api);
	yield* eventually(api.agents.roster({}), (rows) => rows.length === 2);
	const container = yield* render(<FleetPanel {...nowhere} api={api} />);
	yield* until(() => container.querySelector('[aria-label="Open hand"]') !== null, "the agent to reach the roster");
	expect(groupsOf(container)).toEqual([
		["Preparing", "1"],
		["Smoothers", "1"],
	]);
	expect(container.querySelector('[aria-label="Open smoother"]')).toBeNull();

	yield* openGroup(container, "Smoothers");
	yield* until(() => container.querySelector('[aria-label="Open smoother"]') !== null, "the smoothers group to open");
});

it.glass("writes a berth's repository and branch as one path that breaks only after a slash", function* ({ api, render }) {
	yield* crewed(api);
	yield* api.reclamation.plan({
		agentId: identity(CREW).agentId,
		runner: "local",
		plan: { root: "/moorage", berths: [{ slug: "antumbra", source: "/repo", ref: "main", branch: BRANCH, path: "/moorage/antumbra" }] },
	});
	const container = yield* render(<FleetPanel {...nowhere} api={api} />);
	yield* until(() => container.textContent?.includes(BRANCH) === true, "the berth to reach the card");
	const path = spanSaying(container, `antumbra ${BRANCH}`);
	expect(path?.className).toContain("font-mono");
	expect(path?.querySelectorAll("wbr").length).toBe(2);
});

it.glass("carries the whole voyage name in the eyebrow's tooltip", function* ({ api, render }) {
	yield* crewed(api);
	const container = yield* render(<FleetPanel {...nowhere} api={api} />);
	yield* until(() => container.querySelector(`[aria-label="Open voyage ${VOYAGE_NAME}"]`) !== null, "the eyebrow to name its voyage");
	const eyebrow = container.querySelector<HTMLElement>(`[aria-label="Open voyage ${VOYAGE_NAME}"]`);
	expect(eyebrow?.className).toContain("truncate");
	expect(eyebrow?.querySelector("svg")).toBeNull();
	yield* settle(() => eyebrow?.focus());
	yield* until(
		() => document.body.querySelector('[data-slot="tooltip-content"]')?.textContent?.startsWith(VOYAGE_NAME) === true,
		"the tooltip to say the whole voyage name",
	);
});

it.glass("stands Retire in the title row beside the role it would retire", function* ({ api, render }) {
	yield* crewed(api);
	const container = yield* render(<FleetPanel {...nowhere} api={api} />);
	yield* until(() => buttonSaying(container, "Retire") !== undefined, "the card to offer Retire");
	const role = container.querySelector('[aria-label="Open hand"]');
	const retire = buttonSaying(container, "Retire") ?? null;
	expect(role?.textContent).toContain("hand");
	expect(role?.parentElement?.contains(retire)).toBe(true);
});
