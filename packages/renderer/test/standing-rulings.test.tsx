import type { OpenRulingsView, StandingRulingsView, StandingRulingView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { beforeEach, vi } from "vitest";
import { mount, settle, write } from "#test/dom.ts";
import { RulingsPanel } from "#views/rulings.tsx";

const { openFeeds, standingFeeds, supersedeRuling, withdrawRuling } = vi.hoisted(() => {
	const open: Array<(view: OpenRulingsView) => void> = [];
	const standing: Array<(view: StandingRulingsView) => void> = [];
	return {
		openFeeds: open,
		standingFeeds: standing,
		supersedeRuling: vi.fn(),
		withdrawRuling: vi.fn(),
	};
});

vi.mock("#adapters/trpc-rulings.ts", () => ({
	askMoreOnRuling: vi.fn(),
	parkRuling: vi.fn(),
	proclaimRuling: vi.fn(),
	reclassifyRuling: vi.fn(),
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
	withdrawRuling,
}));

const berthReclaim: StandingRulingView = {
	answer: "a berth is reclaimed only once its branch is pushed",
	chosen: null,
	id: "ruling-10",
	question: "When may a berth be reclaimed?",
	radius: "fleet",
	ruledAt: "2026-08-14T16:20:00.000Z",
	ruledBy: "admiral",
	ruledByAgent: null,
	stale: false,
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
	ruledBy: "captain",
	ruledByAgent: { id: "agent-mate", role: "captain" },
	stale: false,
	subjects: [{ id: "voyage-1", kind: "voyage", label: "Chart the reef" }],
	urgency: "blocking",
};

const showing = (mounted: Effect.Success<ReturnType<typeof mount>>, standing: ReadonlyArray<StandingRulingView>): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<RulingsPanel />));
		yield* settle(() => openFeeds.at(-1)?.({ rulings: [] }));
		yield* settle(() => standingFeeds.at(-1)?.({ rulings: standing }));
	});

const buttonSaying = (mounted: Effect.Success<ReturnType<typeof mount>>, words: string) =>
	[...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes(words) === true);

const keyed = (target: Element | null | undefined, key: string) => {
	target?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key }));
};

const picking = (mounted: Effect.Success<ReturnType<typeof mount>>, words: string): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => keyed(mounted.container.querySelector('[role="combobox"]'), "ArrowDown"));
		yield* settle(() =>
			keyed(
				[...document.querySelectorAll('[role="option"]')].find((option) => option.textContent?.includes(words) === true),
				"Enter",
			),
		);
	});

const writing = (mounted: Effect.Success<ReturnType<typeof mount>>, label: string, words: string): Effect.Effect<void> =>
	settle(() => {
		const tag = [...mounted.container.querySelectorAll("label")].find((each) => each.textContent === label);
		const box = mounted.container.querySelector<HTMLInputElement>(`[id="${tag?.htmlFor}"]`);
		if (box !== null) write(box, words);
	});

const questionsIn = (list: Element | undefined): ReadonlyArray<string | null> =>
	[...(list?.querySelectorAll("li h3") ?? [])].map((heading) => heading.textContent);

beforeEach(() => {
	openFeeds.length = 0;
	standingFeeds.length = 0;
	supersedeRuling.mockReset();
	supersedeRuling.mockReturnValue(Effect.void);
	withdrawRuling.mockReset();
	withdrawRuling.mockReturnValue(Effect.void);
});

it.effect("lists what stands newest first with who ruled and what", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, [berthReclaim, chartAuthority]);

		const questions = [...mounted.container.querySelectorAll("li h3")].map((heading) => heading.textContent);
		expect(questions).toEqual([berthReclaim.question, chartAuthority.question]);
		expect(mounted.container.textContent).toContain(berthReclaim.answer);
		expect(mounted.container.textContent).toContain("ruled by the admiral");
		expect(mounted.container.textContent).toContain("ruled by the captain");
		expect(mounted.container.textContent).toContain("chose: trust the soundings");
		expect(mounted.container.textContent).toContain("Voyage: Chart the reef");
	}),
);

it.effect("supersedes a ruling with the later one picked for it", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, [berthReclaim, chartAuthority]);

		yield* settle(() => buttonSaying(mounted, "Replace with a later ruling")?.click());
		expect(buttonSaying(mounted, "Supersede")?.disabled).toBe(true);
		expect(mounted.container.querySelector('[role="combobox"]')?.getAttribute("aria-label")).toBe(`Supersede "${berthReclaim.question}" with`);
		yield* picking(mounted, chartAuthority.question);
		expect(buttonSaying(mounted, "Supersede")?.disabled).toBe(false);
		yield* settle(() => buttonSaying(mounted, "Supersede")?.click());

		expect(supersedeRuling).toHaveBeenCalledWith({ byRulingId: chartAuthority.id, rulingId: berthReclaim.id });
	}),
);

it.effect("offers no supersession when one ruling stands alone", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, [berthReclaim]);

		expect(buttonSaying(mounted, "Replace with a later ruling")).toBeUndefined();
		expect(mounted.container.querySelector('[role="combobox"]')).toBeNull();
		expect(buttonSaying(mounted, "Supersede")).toBeUndefined();
	}),
);

it.effect("says so when nothing stands yet", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, []);

		expect(mounted.container.textContent).toContain("Nothing stands yet");
	}),
);

it.effect("withdraws a standing ruling with the words that retire it", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, [berthReclaim]);

		yield* settle(() => buttonSaying(mounted, "Take it out of force")?.click());
		expect(buttonSaying(mounted, "Withdraw")?.disabled).toBe(true);
		yield* writing(mounted, "Withdraw because…", "berths are gone entirely");
		expect(buttonSaying(mounted, "Withdraw")?.disabled).toBe(false);
		yield* settle(() => buttonSaying(mounted, "Withdraw")?.click());

		expect(withdrawRuling).toHaveBeenCalledWith({ note: "berths are gone entirely", rulingId: berthReclaim.id });
	}),
);

it.effect("gathers what has gone stale under its own heading", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, [berthReclaim, { ...chartAuthority, stale: true }]);

		const lists = [...mounted.container.querySelectorAll("ul")];
		expect(questionsIn(lists[0])).toEqual([berthReclaim.question]);
		expect(questionsIn(lists[1])).toEqual([chartAuthority.question]);
		expect(mounted.container.textContent).toContain("They bind until you withdraw them");
	}),
);

it.effect("names no stale heading while every ruling still applies", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, [berthReclaim, chartAuthority]);

		expect(mounted.container.querySelectorAll("ul")).toHaveLength(1);
		expect(mounted.container.textContent).not.toContain("Stale");
	}),
);
