import type { OpenRulingsView, RulingView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { beforeEach, vi } from "vitest";
import { mount, settle, write } from "#test/dom.ts";
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
		watchOpenRulings: vi.fn((onRulings: Opened["onRulings"], onError: Opened["onError"]) => {
			held.push({ onError, onRulings });
			return vi.fn();
		}),
	};
});

vi.mock("#adapters/trpc-rulings.ts", () => ({
	askMoreOnRuling: vi.fn(),
	parkRuling: vi.fn(),
	proclaimRuling: vi.fn(),
	reclassifyRuling: vi.fn(),
	ruleOn,
	supersedeRuling: vi.fn(),
	watchOpenRulings,
	watchStandingRulings: vi.fn(() => vi.fn()),
	withdrawRuling: vi.fn(),
}));

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
	contexts: [],
	declared: { radius: "voyage", urgency: "pressing" },
	gatedPieces: [
		{
			pieceId: "piece-2",
			title: "the chart",
			voyageId: "voyage-1",
			voyageName: "Chart the reef",
		},
	],
	id: "ruling-1",
	parked: null,
	question: "Which reading do we plot against?",
	radius: "voyage",
	reclassifications: [
		{
			at: "2026-08-15T09:50:00.000Z",
			by: "captain",
			byAgent: { id: "agent-mate", role: "captain" },
			note: "nothing plots until this lands",
			urgency: "blocking",
		},
	],
	recommendation: { choiceId: "choice-2", reasoning: "the chart was surveyed at slack water" },
	requestedAt: "2026-08-15T09:40:00.000Z",
	requester: { agent: { id: "agent-surveyor", role: "surveyor" }, kind: "agent" },
	rung: {
		kind: "captain",
		voyageId: "voyage-1",
		voyageName: "Chart the reef",
	},
	subjects: [{ id: "surveying", kind: "tag", label: "surveying" }],
	urgency: "blocking",
	voyage: { id: "voyage-1", name: "Chart the reef" },
};

const berths: RulingView = {
	choices: [],
	context: "Two repositories name their default branch differently.",
	contexts: [],
	declared: { radius: "fleet", urgency: "eventual" },
	gatedPieces: [],
	id: "ruling-2",
	parked: null,
	question: "What do we call the branch a berth is cut from?",
	radius: "fleet",
	reclassifications: [],
	recommendation: null,
	requestedAt: "2026-08-15T08:10:00.000Z",
	requester: { agent: { id: "agent-bosun", role: "bosun" }, kind: "agent" },
	rung: { kind: "flagship" },
	subjects: [],
	urgency: "eventual",
	voyage: null,
};

const showing = (mounted: Effect.Success<ReturnType<typeof mount>>, view: OpenRulingsView = { rulings: [shoal, berths] }): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<RulingsPanel />));
		yield* settle(() => opened.at(-1)?.onRulings(view));
	});

const buttonSaying = (mounted: Effect.Success<ReturnType<typeof mount>>, words: string) =>
	[...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes(words) === true);

const answering = (mounted: Effect.Success<ReturnType<typeof mount>>, words: string): Effect.Effect<void> =>
	settle(() => {
		const box = mounted.container.querySelector<HTMLTextAreaElement>("li textarea");
		if (box !== null) write(box, words);
	});

beforeEach(() => {
	opened.length = 0;
	ruleOn.mockReset();
	ruleOn.mockReturnValue(Effect.void);
	watchOpenRulings.mockClear();
});

it.effect("shows every open ruling in the order the feed sent them", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted);

		const questions = [...mounted.container.querySelectorAll("li h3")].map((heading) => heading.textContent);
		expect(questions).toEqual([shoal.question, berths.question]);
		expect(mounted.container.textContent).toContain("Holding the asker");
		expect(mounted.container.textContent).toContain("Binds the fleet");
		expect(mounted.container.textContent).toContain("Asked by the surveyor, Chart the reef");
		expect(mounted.container.textContent).not.toContain("agent-surveyor");
		expect(mounted.container.textContent).toContain("Tag: surveying");
		expect(mounted.container.textContent).toContain("two metres shallower");
		expect(mounted.container.textContent).toContain("Unblocks: the chart (Chart the reef)");
	}),
);

it.effect("groups open rulings under the voyage they are about", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, { rulings: [berths, shoal, { ...berths, id: "ruling-3", voyage: shoal.voyage }] });

		const groups = [...mounted.container.querySelectorAll("section[aria-label]")];
		expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual(["The fleet", "Chart the reef"]);
		expect(groups.map((group) => [...group.querySelectorAll("li h3")].map((heading) => heading.textContent))).toEqual([
			[berths.question],
			[shoal.question, berths.question],
		]);
	}),
);

it.effect("says what rung each open ruling is still waiting on", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted);

		expect(mounted.container.textContent).toContain("Waits on the captain of Chart the reef. Binds the voyage.");
		expect(mounted.container.textContent).toContain("Waits on the flagship. Binds the fleet.");
		expect(mounted.container.textContent).toContain("the captain set urgency blocking");
	}),
);

it.effect("reads a move that touched no axis as a question passed up", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, {
			rulings: [
				{
					...shoal,
					reclassifications: [
						{
							at: "2026-08-15T09:55:00.000Z",
							by: "captain",
							byAgent: { id: "agent-mate", role: "captain" },
							note: "the other ship charts the same reef",
						},
					],
					rung: { kind: "flagship" },
				},
			],
		});

		expect(mounted.container.textContent).toContain("the captain passed it up — the other ship charts the same reef");
	}),
);

it.effect("says nothing about unblocking on a ruling that gates nothing", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, { rulings: [berths] });

		expect(mounted.container.textContent).not.toContain("Unblocks");
	}),
);

it.effect("holds the picked choice and answer while the verdict submits", () =>
	Effect.gen(function* () {
		const requested = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		ruleOn.mockReturnValueOnce(Deferred.succeed(requested, undefined).pipe(Effect.andThen(Deferred.await(release))));
		const mounted = yield* mount();
		yield* showing(mounted, { rulings: [shoal] });

		yield* settle(() => buttonSaying(mounted, "trust the soundings")?.click());
		yield* answering(mounted, "plot against the soundings for now");
		yield* settle(() => buttonSaying(mounted, "Rule")?.click());

		expect(ruleOn).toHaveBeenCalledWith({
			answer: "plot against the soundings for now",
			choiceId: "choice-1",
			rulingId: "ruling-1",
		});
		yield* Deferred.await(requested);
		expect(mounted.container.querySelector("textarea")?.closest("fieldset")?.disabled).toBe(true);
		expect(buttonSaying(mounted, "Ruling…")?.disabled).toBe(true);
		const choice = buttonSaying(mounted, "trust the soundings");
		expect(choice?.closest("form")?.querySelector("fieldset")?.disabled).toBe(true);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(release, undefined));
		});
		expect(choice?.getAttribute("aria-pressed")).toBe("true");
		expect(mounted.container.querySelector("textarea")?.value).toBe("plot against the soundings for now");
	}),
);

it.effect("rules on words alone when no choice is held", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, { rulings: [shoal] });

		yield* settle(() => buttonSaying(mounted, "trust the chart")?.click());
		yield* settle(() => buttonSaying(mounted, "trust the chart")?.click());
		yield* answering(mounted, "resurvey the shoal before plotting anything");
		yield* settle(() => buttonSaying(mounted, "Rule")?.click());

		expect(ruleOn).toHaveBeenCalledWith({
			answer: "resurvey the shoal before plotting anything",
			rulingId: "ruling-1",
		});
	}),
);

it.effect("never sends a verdict with no words beside it", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, { rulings: [shoal] });

		yield* settle(() => buttonSaying(mounted, "trust the soundings")?.click());
		yield* answering(mounted, "   ");
		yield* settle(() => buttonSaying(mounted, "Rule")?.click());

		expect(ruleOn).not.toHaveBeenCalled();
	}),
);

it.effect("says so when nothing is waiting on the admiral", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted, { rulings: [] });

		expect(mounted.container.textContent).toContain("Nothing is waiting on you");
	}),
);
