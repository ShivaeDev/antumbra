import type { OpenRulingsView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { RendererRequestError } from "#adapters/request-error.ts";
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

const mount = () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		yield* Effect.addFinalizer(() =>
			settle(() => {
				root.unmount();
				container.remove();
			}),
		);
		return { container, root };
	});

type Mounted = Effect.Success<ReturnType<typeof mount>>;

const clicking = (words: string): Effect.Effect<void> =>
	settle(() => [...document.querySelectorAll("button")].find((button) => button.textContent === words)?.click());

const showing = (mounted: Mounted): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<RulingsPanel />));
		yield* settle(() => opened.at(-1)?.({ rulings: [] }));
	});

const proclaiming = (mounted: Mounted): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* showing(mounted);
		yield* clicking("Proclaim a ruling");
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
	proclaimRuling.mockReturnValue(Effect.void);
});

it.effect("keeps the proclamation fields behind the header button", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* showing(mounted);

		expect(document.body.textContent).toContain("Proclaim a ruling");
		expect(fieldNamed("Your answer")).toBeNull();
		yield* clicking("Proclaim a ruling");

		expect(fieldNamed("Your answer")).not.toBeNull();
	}),
);

it.effect("proclaims the rule the admiral wrote for itself", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* proclaiming(mounted);

		yield* wroteTheRule();
		yield* writing("Tags", "dredging, charts");
		yield* choosing("Radius", "voyage");
		yield* clicking("Proclaim");

		expect(proclaimRuling).toHaveBeenCalledWith({
			answer: "Survey the channel first, always.",
			context: "Two voyages dredged without surveying.",
			question: "May a voyage dredge a channel?",
			radius: "voyage",
			tags: ["dredging", "charts"],
			urgency: "eventual",
		});
	}),
);

it.effect("names no tags on a rule that carries none", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* proclaiming(mounted);

		yield* wroteTheRule();
		yield* writing("Tags", "  ,  ");
		yield* clicking("Proclaim");

		expect(proclaimRuling.mock.calls[0]?.[0]).not.toHaveProperty("tags");
	}),
);

it.effect("never proclaims a rule missing its context or its answer", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* proclaiming(mounted);
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		expect(proclaimRuling).not.toHaveBeenCalled();
		expect(fieldNamed("Question")?.getAttribute("aria-invalid")).toBe("true");

		yield* writing("Question", "May a voyage dredge a channel?");
		yield* clicking("Proclaim");

		expect(proclaimRuling).not.toHaveBeenCalled();
	}),
);

it.effect("clears the form and closes once the proclamation lands", () =>
	Effect.gen(function* () {
		const mounted = yield* mount();
		yield* proclaiming(mounted);

		yield* wroteTheRule();
		yield* clicking("Proclaim");

		expect(fieldNamed("Your answer")).toBeNull();
		yield* clicking("Proclaim a ruling");
		expect(writtenIn("Question")).toBe("");
	}),
);

it.effect("retains a refused proclamation and waits for retry before clearing and closing", () =>
	Effect.gen(function* () {
		const first = yield* Deferred.make<void, RendererRequestError>();
		const second = yield* Deferred.make<void, RendererRequestError>();
		const requested = yield* Deferred.make<void>();
		const retried = yield* Deferred.make<void>();
		proclaimRuling.mockReturnValueOnce(Deferred.succeed(requested, undefined).pipe(Effect.andThen(Deferred.await(first))));
		proclaimRuling.mockReturnValueOnce(Deferred.succeed(retried, undefined).pipe(Effect.andThen(Deferred.await(second))));
		const mounted = yield* mount();
		yield* proclaiming(mounted);
		yield* wroteTheRule();
		yield* choosing("Radius", "voyage");
		yield* settle(() => document.querySelector("form")?.requestSubmit());
		yield* Deferred.await(requested);
		expect(fieldNamed("Question")?.closest("fieldset")?.disabled).toBe(true);
		expect(fieldNamed("Radius")?.closest("fieldset")?.disabled).toBe(true);
		expect(document.querySelector('[type="submit"]')?.textContent).toBe("Proclaiming…");
		yield* settle(() => {
			Effect.runSync(Deferred.fail(first, new RendererRequestError({ message: "the fleet has no tag dredging" })));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain("the fleet has no tag dredging");
		expect(writtenIn("Question")).toBe("May a voyage dredge a channel?");
		yield* clicking("Proclaim");
		yield* Deferred.await(retried);
		yield* settle(() => {
			Effect.runSync(Deferred.succeed(second, undefined));
		});
		expect(fieldNamed("Your answer")).toBeNull();
		yield* clicking("Proclaim a ruling");
		expect(writtenIn("Question")).toBe("");
		const radius = fieldNamed("Radius");
		expect(radius instanceof HTMLSelectElement ? radius.value : undefined).toBe("fleet");
	}),
);
