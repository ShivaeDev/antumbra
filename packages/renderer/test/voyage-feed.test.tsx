// why: @vitest-environment happy-dom exercises the real subscription lifecycle.

import type { VoyageView } from "@antumbra/contract";
import { reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { VoyagePanel } from "#views/voyage.tsx";

interface Opened {
	readonly onError: (message: string) => void;
	readonly onVoyage: (voyage: VoyageView) => void;
	readonly voyageId: string;
}

const { opened, watchVoyage } = vi.hoisted(() => {
	const opened: Array<Opened> = [];
	return {
		opened,
		watchVoyage: (voyageId: string, onVoyage: Opened["onVoyage"], onError: Opened["onError"]) => {
			opened.push({ onError, onVoyage, voyageId });
			return () => undefined;
		},
	};
});

vi.mock("#adapters/trpc-voyages.ts", () => ({
	charterPiece: vi.fn(),
	focusVoyage: vi.fn(),
	hailCaptain: vi.fn(),
	landPieceVerdict: vi.fn(),
	launchPiece: vi.fn(),
	parkPiece: vi.fn(),
	readArtifactMarkdown: vi.fn(),
	readReportMarkdown: vi.fn(),
	rewirePiece: vi.fn(),
	setCaptainBackend: vi.fn(),
	setCrewBackend: vi.fn(),
	unparkPiece: vi.fn(),
	watchVoyage,
	workPieceNow: vi.fn(),
	writeBoard: vi.fn(),
}));
vi.mock("mermaid", () => ({
	default: { initialize: vi.fn(), render: vi.fn() },
}));

const named = (name: string): VoyageView => ({ ...reefView, name });

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const render = (root: Root, voyageId: string): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.render(<VoyagePanel onError={() => undefined} voyageId={voyageId} />);
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
});

it.effect("waits for the feed's first snapshot before drawing anything", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, "voyage-1");

		expect(container.textContent).toContain("taking a sight…");

		yield* push(() => opened[0]?.onVoyage(reefView));

		expect(container.textContent).toContain("Chart the reef");
		expect(container.textContent).toContain("soundings");
		expect(container.textContent).not.toContain("the reef shifts after a storm");
		expect(container.innerHTML).toContain('title="Show the board"');
		yield* drop(root);
	}),
);

it.effect("draws the newest snapshot in place of the one before it", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, "voyage-1");

		yield* push(() => opened[0]?.onVoyage(named("Chart the reef")));
		yield* push(() => opened[0]?.onVoyage(named("Sound the channel")));

		expect(container.textContent).toContain("Sound the channel");
		expect(container.textContent).not.toContain("Chart the reef");
		yield* drop(root);
	}),
);

it.effect("another voyage is another subscription and another picture", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, "voyage-1");
		yield* push(() => opened[0]?.onVoyage(named("Chart the reef")));

		yield* render(root, "voyage-2");

		expect(opened[1]?.voyageId).toBe("voyage-2");
		expect(container.textContent).not.toContain("Chart the reef");
		expect(container.textContent).toContain("taking a sight…");
		yield* drop(root);
	}),
);

it.effect("says a lost feed over the last picture it was sent", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, "voyage-1");

		yield* push(() => opened[0]?.onVoyage(named("Chart the reef")));
		yield* push(() => opened[0]?.onError("the bridge closed"));

		expect(container.textContent).toContain("feed lost: the bridge closed");
		expect(container.textContent).toContain("Chart the reef");
		yield* drop(root);
	}),
);
