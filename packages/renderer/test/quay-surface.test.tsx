// why: @vitest-environment happy-dom exercises the real click boundary.

import type { QuayGroup, QuayView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { QuayPanel } from "#views/quay.tsx";

interface Opened {
	readonly onError: (message: string) => void;
	readonly onQuay: (quay: QuayView) => void;
}

const { opened, openWindow, watchQuay } = vi.hoisted(() => {
	const opened: Array<Opened> = [];
	return {
		opened,
		openWindow: vi.fn(),
		watchQuay: vi.fn((onQuay: Opened["onQuay"], onError: Opened["onError"]) => {
			opened.push({ onError, onQuay });
			return vi.fn();
		}),
	};
});

vi.mock("#adapters/trpc-quay.ts", () => ({
	adoptChange: vi.fn(),
	dismissChange: vi.fn(),
	refreshChanges: vi.fn(),
	watchQuay,
}));

vi.mock("#adapters/trpc-windows.ts", () => ({ openWindow }));

const row = (group: QuayGroup, title: string) => ({
	change: {
		activityAt: "2026-08-19T09:20:00.000Z",
		checks: "green" as const,
		externalId: "41",
		host: "github",
		id: `change-${title}`,
		isDraft: group === "draft",
		mergeable: "clean" as const,
		observedAt: "2026-08-19T09:22:00.000Z",
		repoId: "repo-1",
		repoName: "shoals",
		review: "approved" as const,
		stage: "open" as const,
		title,
		url: null,
	},
	group,
	originSessionId: "019c1234-session-origin",
	pieceId: "piece-1",
	pieceTitle: "soundings",
	voyageId: "voyage-1",
	voyageName: "Chart the reef",
});

const snapshot: QuayView = {
	hosts: [{ available: true, detail: "signed in as navigator", tag: "github" }],
	pieces: [{ id: "piece-1", title: "soundings", voyageName: "Chart the reef" }],
	rows: [
		row("alongside", "sound the channel"),
		row("draft", "sketch the buoy"),
	],
};

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const showing = (
	root: Root,
	container: HTMLElement,
	view: QuayView = snapshot,
): Effect.Effect<string> =>
	Effect.gen(function* () {
		yield* settle(() => {
			root.render(<QuayPanel onError={() => undefined} />);
		});
		yield* settle(() => opened.at(-1)?.onQuay(view));
		return container.textContent ?? "";
	});

const press = (
	container: HTMLElement,
	label: string,
): Effect.Effect<string> => {
	const pressed = [...container.querySelectorAll("button")].find((button) =>
		(button.textContent ?? "").startsWith(label),
	);
	return Effect.gen(function* () {
		yield* settle(() =>
			pressed?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
		);
		return container.textContent ?? "";
	});
};

beforeEach(() => {
	opened.length = 0;
	openWindow.mockClear();
	watchQuay.mockClear();
});

it.effect("narrows the quay to the group a reader picked", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		const everything = yield* showing(root, container);

		expect(everything).toContain("sound the channel");
		expect(everything).toContain("sketch the buoy");

		const drafts = yield* press(container, "Draft");

		expect(drafts).toContain("sketch the buoy");
		expect(drafts).not.toContain("sound the channel");

		const back = yield* press(container, "Everything");

		expect(back).toContain("sound the channel");
		yield* settle(() => root.unmount());
	}),
);

it.effect("keeps adopting behind its own button rather than on the page", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		const drawn = yield* showing(root, container);

		expect(drawn).toContain("Adopt a change");
		expect(container.querySelector("input")).toBeNull();
		yield* settle(() => root.unmount());
	}),
);

it.effect("reads a change's state as marks rather than a run of glyphs", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		const drawn = yield* showing(root, container);

		expect(drawn).toContain("checks passed");
		expect(drawn).toContain("approved");
		expect(drawn).toContain("merges cleanly");
		yield* settle(() => root.unmount());
	}),
);

it.effect("opens an associated change's canonical session", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* showing(root, container);
		const link = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Open originating session"]',
		);

		expect(link?.textContent).toContain("Session 019c1234");
		yield* settle(() => link?.click());
		expect(openWindow).toHaveBeenCalledWith(
			{ role: "transcript", sessionId: "019c1234-session-origin" },
			expect.any(Function),
		);
		yield* settle(() => root.unmount());
	}),
);

it.effect("shows an unassociated change without a broken session action", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		const unassociated: QuayView = {
			...snapshot,
			rows: [
				{
					...row("alongside", "legacy change"),
					originSessionId: null,
				},
			],
		};
		const drawn = yield* showing(root, container, unassociated);

		expect(drawn).toContain("No linked session");
		expect(
			container.querySelector('button[aria-label="Open originating session"]'),
		).toBeNull();
		yield* settle(() => root.unmount());
	}),
);
