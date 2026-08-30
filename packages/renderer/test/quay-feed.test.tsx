// @vitest-environment happy-dom

import type { QuayView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";
import { QuayPanel } from "#views/quay.tsx";

interface Opened {
	readonly onQuay: (quay: QuayView) => void;
}

const { opened, watchQuay } = vi.hoisted(() => {
	const opened: Array<Opened> = [];
	return {
		opened,
		watchQuay: (onQuay: Opened["onQuay"]) => {
			opened.push({ onQuay });
			return () => undefined;
		},
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
			baseRef: "main",
			body: "Warn the harbour.",
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
			headRef: "work/warning",
			headSha: "0123456789abcdef",
			originSessionId: null,
			pieceId: "piece-1",
			pieceTitle: "soundings",
			voyageId: "voyage-1",
			voyageName: "Chart the reef",
		},
	],
});

const react = (action: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			action();
			return Promise.resolve();
		}),
	);

it.effect("draws a quay snapshot as a change surface", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* react(() => root.render(<QuayPanel onError={() => undefined} onSelect={() => undefined} selectedId={undefined} />));

		expect(container.textContent).toContain("taking a sight…");

		yield* react(() => opened[0]?.onQuay(snapshot("warn on the shoal")));

		expect(container.textContent).toContain("warn on the shoal");
		yield* react(() => root.unmount());
	}),
);
