import type { VoyageView } from "@antumbra/contract";
import { reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, vi } from "vitest";
import { VoyagePanel } from "#views/voyage.tsx";

interface Opened {
	readonly onVoyage: (voyage: VoyageView) => void;
	readonly voyageId: string;
}

const { opened, watchVoyage } = vi.hoisted(() => {
	const opened: Array<Opened> = [];
	return {
		opened,
		watchVoyage: (voyageId: string, onVoyage: Opened["onVoyage"]) => {
			opened.push({ onVoyage, voyageId });
			return () => undefined;
		},
	};
});

vi.mock("#adapters/trpc-costs.ts", () => ({ watchCosts: vi.fn(() => vi.fn()) }));

vi.mock("#adapters/trpc-voyages.ts", () => ({
	charterPiece: vi.fn(),
	focusVoyage: vi.fn(),
	hailCaptain: vi.fn(),
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

const react = (action: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			action();
			return Promise.resolve();
		}),
	);

beforeEach(() => {
	opened.length = 0;
});

it.effect("draws a voyage snapshot as its chart, work, and board", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* react(() => root.render(<VoyagePanel onError={() => undefined} piece={undefined} voyageId="voyage-1" />));

		expect(container.textContent).toContain("taking a sight…");

		yield* react(() => opened[0]?.onVoyage(reefView));

		expect(container.textContent).toContain("Chart the reef");
		expect(container.textContent).toContain("soundings");
		expect(container.textContent).not.toContain("the reef shifts after a storm");
		expect(container.innerHTML).toContain('title="Show the board"');
		yield* react(() => root.unmount());
	}),
);

it.effect("another voyage is another subscription and another picture", () =>
	Effect.gen(function* () {
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* react(() => root.render(<VoyagePanel onError={() => undefined} piece={undefined} voyageId="voyage-1" />));
		yield* react(() => opened[0]?.onVoyage(named("Chart the reef")));

		yield* react(() => root.render(<VoyagePanel onError={() => undefined} piece={undefined} voyageId="voyage-2" />));

		expect(opened[1]?.voyageId).toBe("voyage-2");
		expect(container.textContent).not.toContain("Chart the reef");
		expect(container.textContent).toContain("taking a sight…");
		yield* react(() => root.unmount());
	}),
);
