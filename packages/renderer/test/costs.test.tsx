import type { CostsView } from "@antumbra/contract";
import { costs } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, vi } from "vitest";
import { CostsPanel } from "#views/costs.tsx";
import { ModeNav } from "#views/mode-nav.tsx";

const { opened, watchCosts } = vi.hoisted(() => {
	const told: Array<(view: CostsView) => void> = [];
	return {
		opened: told,
		watchCosts: vi.fn((onCosts: (view: CostsView) => void) => {
			told.push(onCosts);
			return vi.fn();
		}),
	};
});

vi.mock("#adapters/trpc-costs.ts", () => ({ watchCosts }));

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const mount = () => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const showing = (mounted: ReturnType<typeof mount>, view: CostsView): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<CostsPanel />));
		yield* settle(() => opened.at(-1)?.(view));
	});

const cellsIn = (mounted: ReturnType<typeof mount>, table: string): ReadonlyArray<ReadonlyArray<string>> =>
	[...mounted.container.querySelectorAll(`section[aria-label="${table}"] tbody tr`)].map((row) =>
		[...row.querySelectorAll("td")].map((cell) => cell.textContent ?? ""),
	);

const costCells = (mounted: ReturnType<typeof mount>, table: string) => [
	...mounted.container.querySelectorAll(`section[aria-label="${table}"] tbody tr td:last-child`),
];

const opening = (view: CostsView) =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* Effect.addFinalizer(() => settle(() => mounted.root.unmount()));
		yield* showing(mounted, view);
		return mounted;
	});

beforeEach(() => {
	opened.length = 0;
	watchCosts.mockClear();
});

it("offers Costs in the established console navigation", () => {
	expect(renderToStaticMarkup(<ModeNav held={false} mode="fleet" onMode={() => undefined} />)).toContain("Costs");
});

it.effect(
	"lays every voyage out with its turns, its four token counts and its cost, dearest first",
	Effect.fnUntraced(function* () {
		const mounted = yield* opening(costs);

		expect(cellsIn(mounted, "By voyage")).toEqual([
			["Chart the reef", "96", "180,000", "1,320,000", "72,000", "36,000", "≥ $5.76"],
			["Flagship", "24", "30,000", "480,000", "36,000", "6,000", "$2.88"],
		]);
	}),
);

it.effect(
	"marks a partial cost with a floor and leaves an unpriced model reading as not reported",
	Effect.fnUntraced(function* () {
		const mounted = yield* opening(costs);

		expect(cellsIn(mounted, "By model").map((cells) => [cells[0], cells.at(-1)])).toEqual([
			["claude-sonnet-4-5", "$8.64"],
			["gpt-5-codex", "not reported"],
		]);
		expect(costCells(mounted, "By model")[0]?.getAttribute("title")).toBeNull();
		expect(costCells(mounted, "By model")[1]?.getAttribute("title")).toBeTruthy();
		expect(costCells(mounted, "By voyage")[0]?.getAttribute("title")).toBeTruthy();
	}),
);

it.effect(
	"carries the partial mark into the all-time headline",
	Effect.fnUntraced(function* () {
		const mounted = yield* opening(costs);

		expect(mounted.container.querySelector("header")?.textContent).toContain("≥ $8.64 all time");
	}),
);

it.effect(
	"says on the legend which backend never priced a turn",
	Effect.fnUntraced(function* () {
		const mounted = yield* opening(costs);
		const legend = [...mounted.container.querySelectorAll('section[aria-label="By day"] header span, section[aria-label="By day"] span')];

		expect(legend.map((entry) => entry.textContent)).toContain("codex · cost not reported");
		expect(legend.map((entry) => entry.textContent)).toContain("claude");
	}),
);

it.effect(
	"gives spend that belongs to no voyage a row of its own",
	Effect.fnUntraced(function* () {
		const loose = { ...costs.total, costPartial: false, costUsd: 9.5 };
		const mounted = yield* opening({ ...costs, unassigned: loose } satisfies CostsView);

		expect(cellsIn(mounted, "By voyage").map((cells) => [cells[0], cells.at(-1)])).toEqual([
			["No voyage", "$9.50"],
			["Chart the reef", "≥ $5.76"],
			["Flagship", "$2.88"],
		]);
	}),
);

it.effect(
	"waits for a turn before showing any table",
	Effect.fnUntraced(function* () {
		const nothing = { cacheReadTokens: 0, cacheWriteTokens: 0, costPartial: false, costUsd: null, inputTokens: 0, outputTokens: 0, turns: 0 };
		const mounted = yield* opening({ agents: [], days: [], models: [], total: nothing, unassigned: nothing, voyages: [] });

		expect(mounted.container.textContent).toContain("Tokens and cost appear here once an agent takes a turn");
		expect(mounted.container.querySelector("table")).toBeNull();
	}),
);
