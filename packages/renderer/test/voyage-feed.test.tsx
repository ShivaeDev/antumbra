import { settle } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import type { VoyageView } from "@antumbra/contract";
import { reefView } from "@antumbra/contract/fixtures";
import { expect } from "@effect/vitest";
import { beforeEach, vi } from "vitest";
import { GlassContext } from "#adapters/glass.ts";
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

beforeEach(() => {
	opened.length = 0;
});

it.glass("draws a voyage snapshot as its chart, work, and board", function* ({ api, render }) {
	const container = yield* render(
		<GlassContext value={api}>
			<VoyagePanel onError={() => undefined} onPiece={() => undefined} piece={undefined} voyageId="voyage-1" />
		</GlassContext>,
	);

	expect(container.textContent).toContain("taking a sight…");

	yield* settle(() => opened[0]?.onVoyage(reefView));

	expect(container.textContent).toContain("Chart the reef");
	expect(container.textContent).toContain("soundings");
	expect(container.textContent).not.toContain("the reef shifts after a storm");
	expect(container.innerHTML).toContain('title="Show the board"');
});

it.glass("another voyage is another subscription and another picture", function* ({ api, render }) {
	const container = yield* render(
		<GlassContext value={api}>
			<VoyagePanel onError={() => undefined} onPiece={() => undefined} piece={undefined} voyageId="voyage-1" />
		</GlassContext>,
	);
	yield* settle(() => opened[0]?.onVoyage(named("Chart the reef")));

	yield* render(
		<GlassContext value={api}>
			<VoyagePanel onError={() => undefined} onPiece={() => undefined} piece={undefined} voyageId="voyage-2" />
		</GlassContext>,
	);

	expect(opened[1]?.voyageId).toBe("voyage-2");
	expect(container.textContent).not.toContain("Chart the reef");
	expect(container.textContent).toContain("taking a sight…");
});
