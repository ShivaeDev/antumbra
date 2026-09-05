import type { AgentSummary } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { AgentCard } from "#views/agent-card.tsx";

vi.mock("#adapters/trpc.ts", () => ({ retireAgent: vi.fn() }));

const agent = (work: AgentSummary["work"]): AgentSummary => ({
	berths: [],
	canRetire: false,
	charter: "take every depth along the northern edge",
	diag: { currentSessionId: null, intents: [] },
	id: "agent-1",
	role: "navigator",
	sessions: [],
	status: "alive",
	work,
});

const soundings = {
	kind: "piece" as const,
	pieceId: "piece-1",
	pieceTitle: "soundings",
	voyageId: "voyage-1",
	voyageName: "the reef",
};

const card = (summary: AgentSummary, onPiece = vi.fn(), onVoyage = vi.fn()) => (
	<AgentCard agent={summary} onError={() => undefined} onPiece={onPiece} onSelect={() => undefined} onVoyage={onVoyage} selected={undefined} />
);

it("leads with work and keeps the charter in a disclosure", () => {
	const shown = renderToStaticMarkup(card(agent([soundings])));

	expect(shown.indexOf("soundings")).toBeLessThan(shown.indexOf("navigator"));
	expect(shown).toContain("the reef");
	expect(shown).toContain("<details");
	expect(shown).toContain("take every depth along the northern edge");
});

it.effect("opens the linked piece and voyage", () =>
	Effect.gen(function* () {
		const onPiece = vi.fn();
		const onVoyage = vi.fn();
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* Effect.promise(() =>
			act(() => {
				root.render(card(agent([soundings]), onPiece, onVoyage));
				return Promise.resolve();
			}),
		);

		container.querySelector<HTMLButtonElement>('button[title="Open this piece"]')?.click();
		expect(onPiece).toHaveBeenCalledWith("voyage-1", "piece-1");
		container.querySelector<HTMLButtonElement>('button[title="Open this voyage"]')?.click();
		expect(onVoyage).toHaveBeenCalledWith("voyage-1");
		root.unmount();
	}),
);
