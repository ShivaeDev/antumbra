// why: @vitest-environment happy-dom exercises the real subscription lifecycle.

import type { QuayView } from "@antumbra/contract";
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

const { opened, unsubscribe, watchQuay } = vi.hoisted(() => {
	const opened: Array<Opened> = [];
	const unsubscribe = vi.fn();
	return {
		opened,
		unsubscribe,
		watchQuay: vi.fn((onQuay: Opened["onQuay"], onError: Opened["onError"]) => {
			opened.push({ onError, onQuay });
			return unsubscribe;
		}),
	};
});

vi.mock("#adapters/trpc-quay.ts", () => ({
	adoptChange: vi.fn(),
	dismissChange: vi.fn(),
	refreshChanges: vi.fn(),
	watchQuay,
}));

const snapshot = (title: string): QuayView => ({
	hosts: [{ available: true, detail: "signed in as navigator", tag: "github" }],
	pieces: [],
	rows: [
		{
			change: {
				activityAt: "2026-08-19T09:20:00.000Z",
				checks: "green",
				externalId: "41",
				host: "github",
				id: `change-${title}`,
				isDraft: false,
				mergeable: "clean",
				observedAt: "2026-08-19T09:22:00.000Z",
				repoId: "repo-1",
				repoName: "shoals",
				review: "approved",
				stage: "open",
				title,
				url: null,
			},
			group: "alongside",
			originSessionId: null,
			pieceId: "piece-1",
			pieceTitle: "soundings",
			voyageId: "voyage-1",
			voyageName: "Chart the reef",
		},
	],
});

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const render = (root: Root): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.render(<QuayPanel onError={() => undefined} />);
			return Promise.resolve();
		}),
	);

const push = (send: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			send();
			return Promise.resolve();
		}),
	);

const drop = (root: Root): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.unmount();
			return Promise.resolve();
		}),
	);

beforeEach(() => {
	opened.length = 0;
	unsubscribe.mockClear();
	watchQuay.mockClear();
});

it.effect("waits for the feed's first snapshot before drawing anything", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root);

		expect(watchQuay).toHaveBeenCalledTimes(1);
		expect(container.textContent).toContain("taking a sight…");

		yield* push(() => opened[0]?.onQuay(snapshot("warn on the shoal")));

		expect(container.textContent).toContain("warn on the shoal");
		yield* drop(root);
	}),
);

it.effect("draws the newest snapshot in place of the one before it", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root);

		yield* push(() => opened[0]?.onQuay(snapshot("warn on the shoal")));
		yield* push(() => opened[0]?.onQuay(snapshot("sound the channel")));

		expect(container.textContent).toContain("sound the channel");
		expect(container.textContent).not.toContain("warn on the shoal");
		yield* drop(root);
	}),
);

it.effect("says a lost feed over the last picture it was sent", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root);

		yield* push(() => opened[0]?.onQuay(snapshot("warn on the shoal")));
		yield* push(() => opened[0]?.onError("the bridge closed"));

		expect(container.textContent).toContain("feed lost: the bridge closed");
		expect(container.textContent).toContain("warn on the shoal");
		yield* drop(root);
	}),
);

it.effect("lets the subscription go when the panel does", () =>
	Effect.gen(function* () {
		const { root } = mount();
		yield* render(root);
		expect(unsubscribe).not.toHaveBeenCalled();

		yield* drop(root);

		expect(unsubscribe).toHaveBeenCalledTimes(1);
	}),
);
