import type { QuayGroup, QuayRow, QuayView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { QuayPanel } from "#views/quay.tsx";

interface Opened {
	readonly onError: (message: string) => void;
	readonly onQuay: (quay: QuayView) => void;
}

const { dismissChange, opened, openExternal, openWindow, watchQuay } = vi.hoisted(() => {
	const opened: Array<Opened> = [];
	return {
		dismissChange: vi.fn(),
		opened,
		openExternal: vi.fn(),
		openWindow: vi.fn(),
		watchQuay: vi.fn((onQuay: Opened["onQuay"], onError: Opened["onError"]) => {
			opened.push({ onError, onQuay });
			return vi.fn();
		}),
	};
});

vi.mock("#adapters/bridge.ts", () => ({ openExternal }));
vi.mock("#adapters/trpc-quay.ts", () => ({
	adoptChange: vi.fn(),
	dismissChange,
	refreshChanges: vi.fn(),
	watchQuay,
}));
vi.mock("#adapters/trpc-windows.ts", () => ({ openWindow }));

const row = (group: QuayGroup, title: string, over: Partial<QuayRow> = {}): QuayRow => ({
	baseRef: "main",
	body: "## Why\n\nKeep the channel safe.",
	change: {
		activityAt: "2026-08-19T09:20:00.000Z",
		checks: "green",
		externalId: group === "draft" ? "42" : "41",
		host: "github",
		id: `change-${title}`,
		isDraft: group === "draft",
		mergeable: "clean",
		observedAt: "2026-08-19T09:22:00.000Z",
		repoId: group === "draft" ? "repo-2" : "repo-1",
		repoName: group === "draft" ? "harbour" : "shoals",
		review: "approved",
		stage: "open",
		title,
		url: `https://github.test/pull/${group === "draft" ? "42" : "41"}`,
	},
	group,
	headRef: `work/${title.replaceAll(" ", "-")}`,
	headSha: "0123456789abcdef0123456789abcdef01234567",
	originSessionId: "019c1234-session-origin",
	pieceId: "piece-1",
	pieceTitle: "Soundings",
	voyageId: "voyage-1",
	voyageName: "Chart the reef",
	...over,
});

const alongside = row("alongside", "sound the channel");
const draft = row("draft", "sketch the buoy", {
	originSessionId: null,
	pieceId: "piece-2",
	pieceTitle: "Chart",
});
const withdrawn = row("needsAttention", "cut the shoal channel", {
	change: {
		...alongside.change,
		id: "change-withdrawn",
		stage: "withdrawn",
		title: "cut the shoal channel",
	},
	pieceId: "piece-3",
	pieceTitle: "Shoal",
});
const snapshot: QuayView = {
	hosts: [{ available: true, detail: "signed in as navigator", tag: "github" }],
	pieces: [{ id: "piece-1", title: "Soundings", voyageName: "Chart the reef" }],
	rows: [alongside, draft],
};

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

const mount = (selectedId: string | undefined, onSelect = vi.fn()) => {
	const container = document.createElement("div");
	const root = createRoot(container);
	return { container, onSelect, root, selectedId };
};

const showing = (mounted: ReturnType<typeof mount>, view: QuayView = snapshot): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* settle(() => mounted.root.render(<QuayPanel onError={() => undefined} onSelect={mounted.onSelect} selectedId={mounted.selectedId} />));
		yield* settle(() => opened.at(-1)?.onQuay(view));
	});

const dismissal = (mounted: ReturnType<typeof mount>) =>
	[...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Dismiss") === true);

beforeEach(() => {
	opened.length = 0;
	dismissChange.mockClear();
	openExternal.mockClear();
	openWindow.mockClear();
	watchQuay.mockClear();
});

it.effect("presents the selected pull request as an accessible master/detail", () =>
	Effect.gen(function* () {
		const mounted = mount(alongside.change.id);
		yield* showing(mounted);

		expect(mounted.container.querySelector('nav[aria-label="Pull requests"]')).not.toBeNull();
		expect(mounted.container.querySelector('button[aria-current="true"]')?.textContent).toContain("sound the channel");
		expect(mounted.container.textContent).toContain("Keep the channel safe.");
		expect(mounted.container.textContent).toContain("work/sound-the-channel");
		expect(mounted.container.textContent).toContain("Soundings");
		expect(mounted.container.querySelector('label[for="quay-search"]')).not.toBeNull();

		const session = mounted.container.querySelector<HTMLButtonElement>('button[aria-label="Open originating session"]');
		yield* settle(() => session?.click());
		expect(openWindow).toHaveBeenCalledWith({ role: "transcript", sessionId: "019c1234-session-origin" }, expect.any(Function));
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("selects a pull request through the persisted selection boundary", () =>
	Effect.gen(function* () {
		const mounted = mount(undefined);
		yield* showing(mounted);
		const choice = [...mounted.container.querySelectorAll("button")].find((button) => button.textContent?.includes("sketch the buoy") === true);

		yield* settle(() => choice?.click());
		expect(mounted.onSelect).toHaveBeenCalledWith(draft.change.id);
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("opens the external pull request from its detail action", () =>
	Effect.gen(function* () {
		const mounted = mount(alongside.change.id);
		yield* showing(mounted);
		const link = [...mounted.container.querySelectorAll("a")].find((anchor) => anchor.textContent?.includes("Open pull request") === true);

		yield* settle(() => link?.click());
		expect(openExternal).toHaveBeenCalledWith(alongside.change.url);
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("keeps an honest state for an unlinked or missing selection", () =>
	Effect.gen(function* () {
		const unlinked = mount(draft.change.id);
		yield* showing(unlinked);
		expect(unlinked.container.textContent).toContain("No linked session");
		expect(unlinked.container.querySelector('button[aria-label="Open originating session"]')).toBeNull();
		yield* settle(() => unlinked.root.unmount());

		const missing = mount("change-gone");
		yield* showing(missing);
		expect(missing.container.textContent).toContain("Pull request no longer at the quay");
		const back = [...missing.container.querySelectorAll("button")].find((button) => button.textContent?.includes("Back to pull requests") === true);
		yield* settle(() => back?.click());
		expect(missing.onSelect).toHaveBeenCalledWith(undefined);
		yield* settle(() => missing.root.unmount());
	}),
);

it.effect("searches and explains a filter with no results", () =>
	Effect.gen(function* () {
		const mounted = mount(undefined);
		yield* showing(mounted);
		const search = mounted.container.querySelector<HTMLInputElement>("#quay-search");
		yield* settle(() => {
			if (search !== null && nativeValue !== undefined) {
				nativeValue.call(search, "nothing matches this");
				search.dispatchEvent(new Event("input", { bubbles: true }));
			}
		});

		expect(mounted.container.textContent).toContain("No pull requests match these filters.");
		expect(mounted.container.textContent).toContain("Clear filters");
		yield* settle(() => mounted.root.unmount());
	}),
);

it.effect("offers the dismissal only on a pull request that died", () =>
	Effect.gen(function* () {
		const alive = mount(alongside.change.id);
		yield* showing(alive);
		expect(dismissal(alive)).toBeUndefined();
		yield* settle(() => alive.root.unmount());

		const dead = mount(withdrawn.change.id);
		yield* showing(dead, { ...snapshot, rows: [alongside, draft, withdrawn] });
		const button = dismissal(dead);
		expect(button).toBeDefined();

		yield* settle(() => button?.click());
		expect(dismissChange).toHaveBeenCalledWith(withdrawn.change.id, expect.any(Function));
		yield* settle(() => dead.root.unmount());
	}),
);

it.effect("explains an empty quay before there is anything to select", () =>
	Effect.gen(function* () {
		const mounted = mount(undefined);
		yield* showing(mounted, { ...snapshot, rows: [] });

		expect(mounted.container.textContent).toContain("Nothing at the quay");
		expect(mounted.container.textContent).toContain("0 of 0 pull requests");
		yield* settle(() => mounted.root.unmount());
	}),
);
