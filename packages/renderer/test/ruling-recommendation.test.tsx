import type { OpenRulingsView, RulingView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { beforeEach, vi } from "vitest";
import { mount, settle } from "#test/dom.ts";
import { RulingsPanel } from "#views/rulings.tsx";

const { opened, ruleOn } = vi.hoisted(() => {
	const held: Array<(rulings: OpenRulingsView) => void> = [];
	return { opened: held, ruleOn: vi.fn() };
});

vi.mock("#adapters/trpc-rulings.ts", () => ({
	askMoreOnRuling: vi.fn(),
	parkRuling: vi.fn(),
	proclaimRuling: vi.fn(),
	reclassifyRuling: vi.fn(),
	ruleOn,
	supersedeRuling: vi.fn(),
	watchOpenRulings: (onRulings: (rulings: OpenRulingsView) => void) => {
		opened.push(onRulings);
		return () => undefined;
	},
	watchStandingRulings: () => () => undefined,
	withdrawRuling: vi.fn(),
}));

const shoal: RulingView = {
	choices: [
		{ detail: "the sounding is a week old", id: "choice-1", label: "trust the soundings" },
		{ detail: null, id: "choice-2", label: "trust the chart" },
	],
	context: "The eastern shoal sounds two metres shallower than the chart says.",
	contexts: [],
	declared: { radius: "voyage", urgency: "pressing" },
	gatedPieces: [],
	id: "ruling-1",
	parked: null,
	question: "Which reading do we plot against?",
	radius: "voyage",
	reclassifications: [],
	recommendation: { choiceId: "choice-2", reasoning: "the chart was surveyed at slack water" },
	requestedAt: "2026-08-15T09:40:00.000Z",
	requester: { agent: { id: "agent-surveyor", role: "surveyor" }, kind: "agent" },
	rung: { kind: "captain", voyageId: "voyage-1", voyageName: "Chart the reef" },
	subjects: [],
	urgency: "blocking",
	voyage: { id: "voyage-1", name: "Chart the reef" },
};

const showing = (mounted: Effect.Success<ReturnType<typeof mount>>, ruling: RulingView): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<RulingsPanel />));
		yield* settle(() => opened.at(-1)?.({ rulings: [ruling] }));
	});

const offeredIn = (mounted: Effect.Success<ReturnType<typeof mount>>) => [
	...mounted.container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
];

const choicesOf = (mounted: Effect.Success<ReturnType<typeof mount>>) => offeredIn(mounted).map((button) => button.textContent);

beforeEach(() => {
	opened.length = 0;
	ruleOn.mockReset();
	ruleOn.mockReturnValue(Effect.void);
});

it.effect("leads with the choice the asker would take and says why", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, shoal);

		expect(choicesOf(mounted)).toEqual([
			"trust the chartrecommendedthe chart was surveyed at slack water",
			"trust the soundingsthe sounding is a week old",
		]);
	}),
);

it.effect("marks no choice and keeps the offered order when nothing was recommended", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, { ...shoal, recommendation: null });

		expect(mounted.container.textContent).not.toContain("recommended");
		expect(choicesOf(mounted)).toEqual(["trust the soundingsthe sounding is a week old", "trust the chart"]);
	}),
);

it.effect("rules with the recommended choice the admiral kept", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, shoal);

		yield* settle(() => offeredIn(mounted)[0]?.click());
		const box = mounted.container.querySelector("li textarea");
		const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
		yield* settle(() => {
			if (box !== null && nativeValue !== undefined) {
				nativeValue.call(box, "the chart it is");
				box.dispatchEvent(new Event("input", { bubbles: true }));
			}
		});
		yield* settle(() => [...mounted.container.querySelectorAll("button")].find((button) => button.textContent === "Rule")?.click());

		expect(ruleOn).toHaveBeenCalledWith({ answer: "the chart it is", choiceId: "choice-2", rulingId: "ruling-1" });
	}),
);
