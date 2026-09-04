// @vitest-environment happy-dom

import type { OpenRulingsView, RulingView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RulingsPanel } from "#views/rulings.tsx";

const { opened, ruleOn } = vi.hoisted(() => {
	const held: Array<(rulings: OpenRulingsView) => void> = [];
	return { opened: held, ruleOn: vi.fn() };
});

vi.mock("#adapters/trpc-rulings.ts", () => ({
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

const plot: RulingView = {
	approvedPieces: [
		{ pieceId: "piece-1", title: "soundings" },
		{ pieceId: "piece-2", title: "the chart" },
	],
	choices: [
		{ detail: "The plot stands.", id: "choice-approve", label: "approve" },
		{ detail: "The captain re-plots.", id: "choice-redirect", label: "redirect" },
	],
	context: "Sound the shallows first, then chart them.",
	declared: { radius: "voyage", urgency: "pressing" },
	gatedPieces: [],
	id: "ruling-3",
	kind: "approval",
	question: "Approve this plot?",
	radius: "voyage",
	reclassifications: [],
	requestedAt: "2026-08-15T09:40:00.000Z",
	requester: { agentId: "agent-captain", kind: "agent" },
	rung: { kind: "admiral" },
	subjects: [{ kind: "voyage", label: "voyage-1" }],
	urgency: "pressing",
};

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const nativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

const mount = () => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const showing = (mounted: ReturnType<typeof mount>): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<RulingsPanel onError={() => undefined} />));
		yield* settle(() => opened.at(-1)?.({ rulings: [plot] }));
	});

const buttonSaying = (mounted: ReturnType<typeof mount>, words: string) =>
	[...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes(words) === true);

const answering = (mounted: ReturnType<typeof mount>, words: string): Effect.Effect<void> =>
	settle(() => {
		const box = mounted.container.querySelector("li textarea");
		if (box !== null && nativeValue !== undefined) {
			nativeValue.call(box, words);
			box.dispatchEvent(new Event("input", { bubbles: true }));
		}
	});

beforeEach(() => {
	opened.length = 0;
	ruleOn.mockClear();
});

it.effect("an approval names the pieces it asks for", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted);

		expect(mounted.container.textContent).toContain("Asks approval for: soundings, the chart");
		expect(mounted.container.textContent).toContain("Approve or redirect");
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("an approval is answered with approve or redirect, never words alone", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted);

		yield* answering(mounted, "sail it");
		yield* settle(() => buttonSaying(mounted, "Rule")?.click());
		expect(ruleOn).not.toHaveBeenCalled();

		yield* settle(() => buttonSaying(mounted, "approve")?.click());
		yield* settle(() => buttonSaying(mounted, "Rule")?.click());

		expect(ruleOn).toHaveBeenCalledWith({ answer: "sail it", choiceId: "choice-approve", rulingId: "ruling-3" }, expect.any(Function));
		yield* settle(() => mounted.root.unmount());
	}),
);
