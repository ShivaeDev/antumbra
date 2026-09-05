// @vitest-environment happy-dom

import type { OpenRulingsView, RulingView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RulingsPanel } from "#views/rulings.tsx";

const { opened } = vi.hoisted(() => {
	const held: Array<(rulings: OpenRulingsView) => void> = [];
	return { opened: held };
});

vi.mock("#adapters/trpc-rulings.ts", () => ({
	askMoreOnRuling: vi.fn(),
	parkRuling: vi.fn(),
	proclaimRuling: vi.fn(),
	reclassifyRuling: vi.fn(),
	ruleOn: vi.fn(),
	supersedeRuling: vi.fn(),
	watchOpenRulings: (onRulings: (rulings: OpenRulingsView) => void) => {
		opened.push(onRulings);
		return () => undefined;
	},
	watchStandingRulings: () => () => undefined,
	withdrawRuling: vi.fn(),
}));

const asked = (index: number): RulingView => ({
	choices: [],
	context: "The eastern shoal sounds two metres shallower than the chart says.",
	contexts: [],
	declared: { radius: "voyage", urgency: "blocking" },
	gatedPieces: [],
	id: `ruling-${index}`,
	parked: null,
	question: `Which reading do we plot against on leg ${index}?`,
	radius: "voyage",
	reclassifications: [],
	recommendation: null,
	requestedAt: "2026-08-15T09:40:00.000Z",
	requester: { agent: { id: "agent-surveyor", role: "surveyor" }, kind: "agent" },
	rung: { kind: "admiral" },
	subjects: [],
	urgency: "blocking",
	voyage: { id: "voyage-1", name: "Chart the reef" },
});

const taller = { rulings: Array.from({ length: 24 }, (_, index) => asked(index)) };

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

beforeEach(() => {
	opened.length = 0;
});

it.effect("holds every ruling in one scrolling body the panel can bound", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* settle(() => mounted.root.render(<RulingsPanel />));
		yield* settle(() => opened.at(-1)?.(taller));

		const scrollers = [...mounted.container.querySelectorAll("[class~='overflow-y-auto']")];
		const body = scrollers[0];
		expect(scrollers).toHaveLength(1);
		expect(body?.querySelectorAll("li h3")).toHaveLength(taller.rulings.length);
		expect(body?.parentElement?.className).toContain("min-h-0");
		yield* settle(() => mounted.root.unmount());
	}),
);
