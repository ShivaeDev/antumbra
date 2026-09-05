import type { OpenRulingsView, RulingView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RulingsPanel } from "#views/rulings.tsx";

const { askMoreOnRuling, opened, parkRuling, ruleOn } = vi.hoisted(() => {
	const held: Array<(rulings: OpenRulingsView) => void> = [];
	return { askMoreOnRuling: vi.fn(), opened: held, parkRuling: vi.fn(), ruleOn: vi.fn() };
});

vi.mock("#adapters/trpc-rulings.ts", () => ({
	askMoreOnRuling,
	parkRuling,
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
	choices: [],
	context: "The eastern shoal sounds two metres shallower than the chart says.",
	contexts: [],
	declared: { radius: "voyage", urgency: "blocking" },
	gatedPieces: [],
	id: "ruling-1",
	parked: null,
	question: "Which reading do we plot against?",
	radius: "voyage",
	reclassifications: [],
	recommendation: null,
	requestedAt: "2026-08-15T09:40:00.000Z",
	requester: { agent: { id: "agent-surveyor", role: "surveyor" }, kind: "agent" },
	rung: { kind: "admiral" },
	subjects: [],
	urgency: "blocking",
	voyage: { id: "voyage-1", name: "Chart the reef" },
};

const later: RulingView = {
	...shoal,
	id: "ruling-2",
	parked: { at: "2026-08-15T11:00:00.000Z", note: "after the survey lands" },
	question: "What do we call the branch a berth is cut from?",
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

type Mounted = ReturnType<typeof mount>;

const showing = (mounted: Mounted, view: OpenRulingsView): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<RulingsPanel onError={() => undefined} />));
		yield* settle(() => opened.at(-1)?.(view));
	});

const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

const writing = (mounted: Mounted, label: string, words: string): Effect.Effect<void> =>
	settle(() => {
		const tag = [...mounted.container.querySelectorAll("label")].find((each) => each.textContent === label);
		const box = tag === undefined ? null : mounted.container.querySelector<HTMLInputElement>(`input[id="${tag.htmlFor}"]`);
		if (box !== null && nativeValue !== undefined) {
			nativeValue.call(box, words);
			box.dispatchEvent(new Event("input", { bubbles: true }));
		}
	});

const buttonSaying = (mounted: Mounted, words: string) =>
	[...mounted.container.querySelectorAll("button")].find((button) => button.textContent === words);

const entrySaying = (mounted: Mounted, words: string) =>
	[...mounted.container.querySelectorAll("li li")].find((entry) => entry.textContent?.includes(words) === true);

const opening = (mounted: Mounted, words: string): Effect.Effect<void> => settle(() => buttonSaying(mounted, words)?.click());

const fieldsOf = (mounted: Mounted): ReadonlyArray<string | null> =>
	[...mounted.container.querySelectorAll("li label")].map((each) => each.textContent);

beforeEach(() => {
	askMoreOnRuling.mockClear();
	opened.length = 0;
	parkRuling.mockClear();
	ruleOn.mockClear();
});

it.effect("asks the asker for more without ruling anything", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [shoal] });

		yield* opening(mounted, "Ask them for more");
		yield* writing(mounted, "What do you need from them?", "which chart edition are you reading?");
		yield* settle(() => buttonSaying(mounted, "Ask more")?.click());

		expect(askMoreOnRuling).toHaveBeenCalledWith({ note: "which chart edition are you reading?", rulingId: "ruling-1" }, expect.any(Function));
		expect(ruleOn).not.toHaveBeenCalled();
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("leaves a request for later with the words for why", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [shoal] });

		yield* opening(mounted, "Leave it for later");
		yield* writing(mounted, "Why not now?", "the survey lands first");
		yield* settle(() => buttonSaying(mounted, "Not now")?.click());

		expect(parkRuling).toHaveBeenCalledWith({ note: "the survey lands first", rulingId: "ruling-1" }, expect.any(Function));
		expect(ruleOn).not.toHaveBeenCalled();
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("gathers what was left for later under its own heading", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [shoal, later] });

		const group = [...mounted.container.querySelectorAll("section")].find((section) => section.querySelector("h3")?.textContent === "Not now");
		expect(group?.textContent).toContain(later.question);
		expect(group?.textContent).toContain("after the survey lands");
		expect(group?.textContent).not.toContain(shoal.question);
		expect(mounted.container.querySelector("ul")?.textContent).toContain(shoal.question);
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("shows what was said since the request beside the question", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, {
			rulings: [
				{
					...shoal,
					contexts: [
						{ at: "2026-08-15T09:45:00.000Z", author: null, body: "which chart edition are you reading?" },
						{ at: "2026-08-15T09:47:00.000Z", author: { id: "agent-surveyor", role: "surveyor" }, body: "the 2019 edition" },
					],
				},
			],
		});

		expect(entrySaying(mounted, "which chart edition are you reading?")?.textContent).toContain("the admiral");
		expect(entrySaying(mounted, "the 2019 edition")?.textContent).toContain("the surveyor");
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("offers the answer alone until the admiral opens another act", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [shoal] });

		expect(fieldsOf(mounted)).toEqual(["Your answer"]);
		yield* opening(mounted, "Change radius or urgency");

		expect(fieldsOf(mounted)).toEqual(["Your answer", "Radius", "Urgency", "Why"]);
		yield* settle(() => mounted.root.unmount());
	}),
);
