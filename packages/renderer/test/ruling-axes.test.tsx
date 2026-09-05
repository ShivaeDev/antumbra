// @vitest-environment happy-dom

import type { OpenRulingsView, RulingView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RulingsPanel } from "#views/rulings.tsx";

const { askMoreOnRuling, opened, parkRuling, reclassifyRuling } = vi.hoisted(() => {
	const held: Array<(rulings: OpenRulingsView) => void> = [];
	return { askMoreOnRuling: vi.fn(), opened: held, parkRuling: vi.fn(), reclassifyRuling: vi.fn() };
});

vi.mock("#adapters/trpc-rulings.ts", () => ({
	askMoreOnRuling,
	parkRuling,
	proclaimRuling: vi.fn(),
	reclassifyRuling,
	ruleOn: vi.fn(),
	supersedeRuling: vi.fn(),
	watchOpenRulings: (onRulings: (rulings: OpenRulingsView) => void) => {
		opened.push(onRulings);
		return () => undefined;
	},
	watchStandingRulings: () => () => undefined,
	withdrawRuling: vi.fn(),
}));

const moved: RulingView = {
	choices: [],
	context: "The eastern shoal sounds two metres shallower than the chart says.",
	contexts: [],
	declared: { radius: "voyage", urgency: "pressing" },
	gatedPieces: [],
	id: "ruling-1",
	parked: null,
	question: "Which reading do we plot against?",
	radius: "voyage",
	reclassifications: [
		{
			at: "2026-08-15T09:50:00.000Z",
			by: "admiral",
			byAgentId: null,
			note: "nothing plots until this lands",
			urgency: "blocking",
		},
	],
	requestedAt: "2026-08-15T09:40:00.000Z",
	requester: { agentId: "agent-surveyor", kind: "agent" },
	rung: { kind: "admiral" },
	subjects: [],
	urgency: "blocking",
};

const unmoved: RulingView = {
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
	requestedAt: "2026-08-15T08:10:00.000Z",
	requester: { agentId: "agent-bosun", kind: "agent" },
	rung: { kind: "flagship" },
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

const mount = () => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

type Mounted = ReturnType<typeof mount>;

const showing = (mounted: Mounted, view: OpenRulingsView = { rulings: [moved, unmoved] }): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<RulingsPanel onError={() => undefined} />));
		yield* settle(() => opened.at(-1)?.(view));
	});

const buttonSaying = (mounted: Mounted, words: string) =>
	[...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes(words) === true);

const choosing = (mounted: Mounted, label: string, word: string): Effect.Effect<void> =>
	settle(() => {
		const box = [...mounted.container.querySelectorAll("select")].find(
			(select) => mounted.container.querySelector(`li label[for="${select.id}"]`)?.textContent === label,
		);
		if (box !== undefined) {
			box.value = word;
			box.dispatchEvent(new Event("change", { bubbles: true }));
		}
	});

beforeEach(() => {
	opened.length = 0;
	reclassifyRuling.mockClear();
});

it.effect("shows the declared axis only where it was moved", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted);

		const [first, second] = [...mounted.container.querySelectorAll("li")];
		expect(first?.textContent).toContain("Holding the asker");
		expect(first?.textContent).toContain("declared pressing");
		expect(first?.textContent).not.toContain("declared voyage");
		expect(first?.textContent).toContain("the admiral set urgency blocking — nothing plots until this lands");
		expect(second?.textContent).not.toContain("declared");
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("reclassifies with only the axis that moved", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, { rulings: [moved] });

		yield* settle(() => buttonSaying(mounted, "Reclassify")?.click());
		expect(reclassifyRuling).not.toHaveBeenCalled();
		yield* choosing(mounted, "Radius", "fleet");
		yield* settle(() => buttonSaying(mounted, "Reclassify")?.click());

		expect(reclassifyRuling).toHaveBeenCalledWith({ radius: "fleet", rulingId: "ruling-1" }, expect.any(Function));
		yield* settle(() => mounted.root.unmount());
	}),
);
