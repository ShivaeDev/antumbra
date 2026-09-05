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
	document.body.append(container);
	return { container, root: createRoot(container) };
};

type Mounted = ReturnType<typeof mount>;

const clicking = (words: string): Effect.Effect<void> =>
	settle(() => [...document.querySelectorAll("button")].find((button) => button.textContent === words)?.click());

const showing = (mounted: Mounted, onError: (message: string) => void): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<RulingsPanel onError={onError} />));
		yield* settle(() => opened.at(-1)?.({ rulings: [] }));
	});

const proclaiming = (mounted: Mounted, onError: (message: string) => void): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* showing(mounted, onError);
		yield* clicking("Proclaim a ruling");
	});

const leaving = (mounted: Mounted): Effect.Effect<void> =>
	settle(() => {
		mounted.root.unmount();
		mounted.container.remove();
	});

const fieldNamed = (label: string) => {
	const tag = [...document.querySelectorAll("label")].find((each) => each.textContent === label);
	return tag === undefined ? null : document.querySelector<HTMLElement>(`[id="${tag.htmlFor}"]`);
};

const writtenIn = (label: string): string | undefined => {
	const box = fieldNamed(label);
	return box instanceof HTMLInputElement || box instanceof HTMLTextAreaElement ? box.value : undefined;
};

const valueSetter = (box: HTMLElement) =>
	Object.getOwnPropertyDescriptor(box instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value")?.set;

const writing = (label: string, words: string): Effect.Effect<void> =>
	settle(() => {
		const box = fieldNamed(label);
		const set = box === null ? undefined : valueSetter(box);
		if (box !== null && set !== undefined) {
			set.call(box, words);
			box.dispatchEvent(new Event("input", { bubbles: true }));
		}
	});

const choosing = (label: string, word: string): Effect.Effect<void> =>
	settle(() => {
		const box = fieldNamed(label);
		if (box instanceof HTMLSelectElement) {
			box.value = word;
			box.dispatchEvent(new Event("change", { bubbles: true }));
		}
	});

const wroteTheRule = (): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* writing("Question", "May a voyage dredge a channel?");
		yield* writing("Context", "Two voyages dredged without surveying.");
		yield* writing("Your answer", "Survey the channel first, always.");
	});

beforeEach(() => {
	opened.length = 0;
	proclaimRuling.mockReset();
});

it.effect("keeps the proclamation fields behind the header button", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* showing(mounted, () => undefined);

		expect(document.body.textContent).toContain("Proclaim a ruling");
		expect(fieldNamed("Your answer")).toBeNull();
		yield* clicking("Proclaim a ruling");

		expect(fieldNamed("Your answer")).not.toBeNull();
		yield* leaving(mounted);
	}),
);

it.effect("proclaims the rule the admiral wrote for itself", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* proclaiming(mounted, () => undefined);

		yield* wroteTheRule();
		yield* writing("Tags", "dredging, charts");
		yield* choosing("Radius", "voyage");
		yield* clicking("Proclaim");

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
			expect.any(Function),
		);
		yield* leaving(mounted);
	}),
);

it.effect("names no tags on a rule that carries none", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* proclaiming(mounted, () => undefined);

		yield* wroteTheRule();
		yield* writing("Tags", "  ,  ");
		yield* clicking("Proclaim");

		expect(proclaimRuling.mock.calls[0]?.[0]).not.toHaveProperty("tags");
		yield* leaving(mounted);
	}),
);

it.effect("never proclaims a rule missing its context or its answer", () =>
	Effect.gen(function* () {
		const mounted = mount();
		yield* proclaiming(mounted, () => undefined);

		yield* writing("Question", "May a voyage dredge a channel?");
		yield* clicking("Proclaim");

		expect(proclaimRuling).not.toHaveBeenCalled();
		yield* leaving(mounted);
	}),
);

it.effect("clears the form and closes once the proclamation lands", () =>
	Effect.gen(function* () {
		proclaimRuling.mockImplementation((_request: unknown, onDone: () => void) => {
			onDone();
		});
		const mounted = mount();
		yield* proclaiming(mounted, () => undefined);

		yield* wroteTheRule();
		yield* clicking("Proclaim");

		expect(fieldNamed("Your answer")).toBeNull();
		yield* clicking("Proclaim a ruling");
		expect(writtenIn("Question")).toBe("");
		yield* leaving(mounted);
	}),
);

it.effect("shows the words a refused proclamation came back with", () =>
	Effect.gen(function* () {
		const refusals: Array<string> = [];
		proclaimRuling.mockImplementation((_request: unknown, _onDone: () => void, onError: (message: string) => void) => {
			onError("the fleet has no tag dredging");
		});
		const mounted = mount();
		yield* proclaiming(mounted, (message) => refusals.push(message));

		yield* wroteTheRule();
		yield* clicking("Proclaim");

		expect(refusals).toEqual(["the fleet has no tag dredging"]);
		yield* leaving(mounted);
	}),
);
