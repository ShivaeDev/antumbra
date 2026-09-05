// @vitest-environment happy-dom

import type { OpenRulingsView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RulingsPanel } from "#views/rulings.tsx";

const { opened, proclaimRuling } = vi.hoisted(() => {
	const held: Array<(rulings: OpenRulingsView) => void> = [];
	return { opened: held, proclaimRuling: vi.fn() };
});

vi.mock("#adapters/trpc-rulings.ts", () => ({
	askMoreOnRuling: vi.fn(),
	parkRuling: vi.fn(),
	proclaimRuling,
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

const showing = (mounted: Mounted, onError: (message: string) => void): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<RulingsPanel onError={onError} />));
		yield* settle(() => opened.at(-1)?.({ rulings: [] }));
	});

const fieldNamed = (mounted: Mounted, label: string) => {
	const tag = [...mounted.container.querySelectorAll("label")].find((each) => each.textContent === label);
	return tag === undefined ? null : mounted.container.querySelector<HTMLElement>(`[id="${tag.htmlFor}"]`);
};

const valueSetter = (box: HTMLElement) =>
	Object.getOwnPropertyDescriptor(box instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")?.set;

const writing = (mounted: Mounted, label: string, words: string): Effect.Effect<void> =>
	settle(() => {
		const box = fieldNamed(mounted, label);
		const set = box === null ? undefined : valueSetter(box);
		if (box !== null && set !== undefined) {
			set.call(box, words);
			box.dispatchEvent(new Event("input", { bubbles: true }));
		}
	});

const choosing = (mounted: Mounted, label: string, word: string): Effect.Effect<void> =>
	settle(() => {
		const box = fieldNamed(mounted, label);
		if (box instanceof HTMLSelectElement) {
			box.value = word;
			box.dispatchEvent(new Event("change", { bubbles: true }));
		}
	});

const proclaiming = (mounted: Mounted): Effect.Effect<void> =>
	settle(() => [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Proclaim") === true)?.click());

const wroteTheRule = (mounted: Mounted): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* writing(mounted, "Question", "May a voyage dredge a channel?");
		yield* writing(mounted, "Context", "Two voyages dredged without surveying.");
		yield* writing(mounted, "Your answer", "Survey the channel first, always.");
	});

beforeEach(() => {
	opened.length = 0;
	proclaimRuling.mockReset();
});

it.effect("proclaims the rule the admiral wrote for itself", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, () => undefined);

		yield* wroteTheRule(mounted);
		yield* writing(mounted, "Tags", "dredging, charts");
		yield* choosing(mounted, "Radius", "voyage");
		yield* proclaiming(mounted);

		expect(proclaimRuling).toHaveBeenCalledWith(
			{
				answer: "Survey the channel first, always.",
				context: "Two voyages dredged without surveying.",
				question: "May a voyage dredge a channel?",
				radius: "voyage",
				tags: ["dredging", "charts"],
				urgency: "eventual",
			},
			expect.any(Function),
		);
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("names no tags on a rule that carries none", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, () => undefined);

		yield* wroteTheRule(mounted);
		yield* writing(mounted, "Tags", "  ,  ");
		yield* proclaiming(mounted);

		expect(proclaimRuling.mock.calls[0]?.[0]).not.toHaveProperty("tags");
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("never proclaims a rule missing its context or its answer", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, () => undefined);

		yield* writing(mounted, "Question", "May a voyage dredge a channel?");
		yield* proclaiming(mounted);

		expect(proclaimRuling).not.toHaveBeenCalled();
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("shows the words a refused proclamation came back with", () =>
	Effect.gen(function* () {
		const refusals: Array<string> = [];
		proclaimRuling.mockImplementation((_request: unknown, onError: (message: string) => void) => {
			onError("the fleet has no tag dredging");
		});
		const mounted = mount();
		yield* showing(mounted, (message) => refusals.push(message));

		yield* wroteTheRule(mounted);
		yield* proclaiming(mounted);

		expect(refusals).toEqual(["the fleet has no tag dredging"]);
		yield* settle(() => mounted.root.unmount());
	}),
);
