// why: @vitest-environment happy-dom exercises the choice, the words and the
// verdict through the same DOM boundaries a keyboard or pointer uses.

import type { OpenRulingsView, RulingView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RulingsPanel } from "#views/rulings.tsx";

interface Opened {
	readonly onError: (message: string) => void;
	readonly onRulings: (rulings: OpenRulingsView) => void;
}

const { opened, ruleOn, watchOpenRulings } = vi.hoisted(() => {
	const held: Array<Opened> = [];
	return {
		opened: held,
		ruleOn: vi.fn(),
		watchOpenRulings: vi.fn(
			(onRulings: Opened["onRulings"], onError: Opened["onError"]) => {
				held.push({ onError, onRulings });
				return vi.fn();
			},
		),
	};
});

vi.mock("#adapters/trpc-rulings.ts", () => ({ ruleOn, watchOpenRulings }));

const shoal: RulingView = {
	choices: [
		{
			detail: "the sounding is a week old",
			id: "choice-1",
			label: "trust the soundings",
		},
		{ detail: null, id: "choice-2", label: "trust the chart" },
	],
	context: "The eastern shoal sounds two metres shallower than the chart says.",
	gatedPieces: [
		{
			pieceId: "piece-2",
			title: "the chart",
			voyageId: "voyage-1",
			voyageName: "Chart the reef",
		},
	],
	id: "ruling-1",
	question: "Which reading do we plot against?",
	radius: "voyage",
	requestedAt: "2026-08-15T09:40:00.000Z",
	requesterAgentId: "agent-surveyor",
	subjects: [{ kind: "tag", label: "surveying" }],
	urgency: "blocking",
};

const berths: RulingView = {
	choices: [],
	context: "Two repositories name their default branch differently.",
	gatedPieces: [],
	id: "ruling-2",
	question: "What do we call the branch a berth is cut from?",
	radius: "fleet",
	requestedAt: "2026-08-15T08:10:00.000Z",
	requesterAgentId: "agent-bosun",
	subjects: [],
	urgency: "eventual",
};

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const nativeValue = Object.getOwnPropertyDescriptor(
	HTMLTextAreaElement.prototype,
	"value",
)?.set;

const mount = () => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const showing = (
	mounted: ReturnType<typeof mount>,
	view: OpenRulingsView = { rulings: [shoal, berths] },
): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() =>
			mounted.root.render(<RulingsPanel onError={() => undefined} />),
		);
		yield* settle(() => opened.at(-1)?.onRulings(view));
	});

const buttonSaying = (mounted: ReturnType<typeof mount>, words: string) =>
	[...mounted.container.querySelectorAll("button")].find(
		(button) => button.textContent?.includes(words) === true,
	);

const answering = (
	mounted: ReturnType<typeof mount>,
	words: string,
): Effect.Effect<void> =>
	settle(() => {
		const box = mounted.container.querySelector("textarea");
		if (box !== null && nativeValue !== undefined) {
			nativeValue.call(box, words);
			box.dispatchEvent(new Event("input", { bubbles: true }));
		}
	});

beforeEach(() => {
	opened.length = 0;
	ruleOn.mockClear();
	watchOpenRulings.mockClear();
});

it.effect("shows every open ruling in the order the feed sent them", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted);

		const questions = [...mounted.container.querySelectorAll("h3")].map(
			(heading) => heading.textContent,
		);
		expect(questions).toEqual([shoal.question, berths.question]);
		expect(mounted.container.textContent).toContain("Holding the asker");
		expect(mounted.container.textContent).toContain("Binds the fleet");
		expect(mounted.container.textContent).toContain("agent-surveyor");
		expect(mounted.container.textContent).toContain("Tag: surveying");
		expect(mounted.container.textContent).toContain("two metres shallower");
		expect(mounted.container.textContent).toContain(
			"Unblocks: the chart (Chart the reef)",
		);
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("says nothing about unblocking on a ruling that gates nothing", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [berths] });

		expect(mounted.container.textContent).not.toContain("Unblocks");
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("rules with the choice picked and the words written beside it", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [shoal] });

		yield* settle(() => buttonSaying(mounted, "trust the soundings")?.click());
		yield* answering(mounted, "plot against the soundings for now");
		yield* settle(() => buttonSaying(mounted, "Rule")?.click());

		expect(ruleOn).toHaveBeenCalledWith(
			{
				answer: "plot against the soundings for now",
				choiceId: "choice-1",
				rulingId: "ruling-1",
			},
			expect.any(Function),
		);
		yield* settle(() => mounted.root.unmount());
	}),
);

// why: whoever answers can always answer past every choice the asker listed,
// so letting a pick go must leave the words standing on their own.
it.effect("rules on words alone when no choice is held", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [shoal] });

		yield* settle(() => buttonSaying(mounted, "trust the chart")?.click());
		yield* settle(() => buttonSaying(mounted, "trust the chart")?.click());
		yield* answering(mounted, "resurvey the shoal before plotting anything");
		yield* settle(() => buttonSaying(mounted, "Rule")?.click());

		expect(ruleOn).toHaveBeenCalledWith(
			{
				answer: "resurvey the shoal before plotting anything",
				rulingId: "ruling-1",
			},
			expect.any(Function),
		);
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("never sends a verdict with no words beside it", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [shoal] });

		yield* settle(() => buttonSaying(mounted, "trust the soundings")?.click());
		yield* answering(mounted, "   ");
		yield* settle(() => buttonSaying(mounted, "Rule")?.click());

		expect(ruleOn).not.toHaveBeenCalled();
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("says so when nothing is waiting on the admiral", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [] });

		expect(mounted.container.textContent).toContain(
			"Nothing is waiting on you",
		);
		yield* settle(() => mounted.root.unmount());
	}),
);
