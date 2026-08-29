// why: @vitest-environment happy-dom drives the standing list and the pick of
// a superseding ruling through the same DOM boundaries a keyboard uses.

import type {
	OpenRulingsView,
	StandingRulingsView,
	StandingRulingView,
} from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RulingsPanel } from "#views/rulings.tsx";

const { openFeeds, standingFeeds, supersedeRuling } = vi.hoisted(() => {
	const open: Array<(view: OpenRulingsView) => void> = [];
	const standing: Array<(view: StandingRulingsView) => void> = [];
	return { openFeeds: open, standingFeeds: standing, supersedeRuling: vi.fn() };
});

vi.mock("#adapters/trpc-rulings.ts", () => ({
	ruleOn: vi.fn(),
	supersedeRuling,
	watchOpenRulings: (onRulings: (view: OpenRulingsView) => void) => {
		openFeeds.push(onRulings);
		return () => undefined;
	},
	watchStandingRulings: (onRulings: (view: StandingRulingsView) => void) => {
		standingFeeds.push(onRulings);
		return () => undefined;
	},
}));

const berthReclaim: StandingRulingView = {
	answer: "a berth is reclaimed only once its branch is pushed",
	chosen: null,
	id: "ruling-10",
	question: "When may a berth be reclaimed?",
	radius: "fleet",
	ruledAt: "2026-08-14T16:20:00.000Z",
	ruledBy: "admiral",
	subjects: [],
	urgency: "pressing",
};

const chartAuthority: StandingRulingView = {
	answer: "the surveyed depth wins over the printed one",
	chosen: "trust the soundings",
	id: "ruling-11",
	question: "Which depth is charted when survey and chart disagree?",
	radius: "voyage",
	ruledAt: "2026-08-13T11:00:00.000Z",
	ruledBy: "admiral",
	subjects: [{ kind: "voyage", label: "voyage-1" }],
	urgency: "blocking",
};

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

const showing = (
	mounted: ReturnType<typeof mount>,
	standing: ReadonlyArray<StandingRulingView>,
): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() =>
			mounted.root.render(<RulingsPanel onError={() => undefined} />),
		);
		yield* settle(() => openFeeds.at(-1)?.({ rulings: [] }));
		yield* settle(() => standingFeeds.at(-1)?.({ rulings: standing }));
	});

const buttonSaying = (mounted: ReturnType<typeof mount>, words: string) =>
	[...mounted.container.querySelectorAll("button")].find(
		(button) => button.textContent?.includes(words) === true,
	);

const keyed = (target: Element | null | undefined, key: string) => {
	target?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }));
};

const picking = (
	mounted: ReturnType<typeof mount>,
	words: string,
): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() =>
			keyed(mounted.container.querySelector('[role="combobox"]'), "ArrowDown"),
		);
		yield* settle(() =>
			keyed(
				[...document.querySelectorAll('[role="option"]')].find(
					(option) => option.textContent?.includes(words) === true,
				),
				"Enter",
			),
		);
	});

beforeEach(() => {
	openFeeds.length = 0;
	standingFeeds.length = 0;
	supersedeRuling.mockClear();
});

it.effect("lists what stands newest first with who ruled and what", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, [berthReclaim, chartAuthority]);

		const questions = [...mounted.container.querySelectorAll("h3")].map(
			(heading) => heading.textContent,
		);
		expect(questions).toEqual([berthReclaim.question, chartAuthority.question]);
		expect(mounted.container.textContent).toContain(berthReclaim.answer);
		expect(mounted.container.textContent).toContain("ruled by the admiral");
		expect(mounted.container.textContent).toContain(
			"chose: trust the soundings",
		);
		expect(mounted.container.textContent).toContain("Voyage: voyage-1");
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("supersedes a ruling with the later one picked for it", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, [berthReclaim, chartAuthority]);

		yield* picking(mounted, chartAuthority.question);
		yield* settle(() => buttonSaying(mounted, "Supersede")?.click());

		expect(supersedeRuling).toHaveBeenCalledWith(
			{ byRulingId: chartAuthority.id, rulingId: berthReclaim.id },
			expect.any(Function),
		);
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("never sends a supersession with nothing picked", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, [berthReclaim, chartAuthority]);

		yield* settle(() => buttonSaying(mounted, "Supersede")?.click());

		expect(supersedeRuling).not.toHaveBeenCalled();
		yield* settle(() => mounted.root.unmount());
	}),
);

// why: a ruling standing alone has nothing that could take its place, so the
// control does not offer an empty pick.
it.effect("offers no supersession when one ruling stands alone", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, [berthReclaim]);

		expect(mounted.container.querySelector('[role="combobox"]')).toBeNull();
		expect(buttonSaying(mounted, "Supersede")).toBeUndefined();
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("says so when nothing stands yet", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, []);

		expect(mounted.container.textContent).toContain("Nothing stands yet");
		yield* settle(() => mounted.root.unmount());
	}),
);
