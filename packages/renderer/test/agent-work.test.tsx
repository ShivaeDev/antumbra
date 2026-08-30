// why: @vitest-environment happy-dom follows the links on a card the way a
// reader clicks them.

import type { AgentSummary, WorkChange } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import type { ConsoleTarget } from "#console/navigation.ts";
import { AgentCard } from "#views/agent-card.tsx";

vi.mock("#adapters/bridge.ts", () => ({
	client: {},
	openExternal: vi.fn(),
	toError: (cause: unknown) => new Error(String(cause)),
}));

const held = (
	standing: WorkChange["standing"],
	url: string | null = "https://example.test/shoals/pull/42",
): WorkChange => ({
	change: {
		activityAt: "2026-08-15T09:20:00.000Z",
		checks: "green",
		externalId: "42",
		host: "github",
		id: "change-1",
		isDraft: false,
		mergeable: "clean",
		observedAt: "2026-08-15T09:25:00.000Z",
		repoId: "repo-1",
		repoName: "shoals",
		review: "approved",
		stage: standing === "landed" ? "landed" : "open",
		title: "Chart the reef",
		url,
	},
	standing,
});

const agent = (work: AgentSummary["work"]): AgentSummary => ({
	berths: [],
	canRetire: false,
	charter: "take every depth along the northern edge",
	diag: { currentSessionId: null, intents: [] },
	id: "agent-1",
	role: "navigator-of-the-northern-approach",
	sessions: [],
	status: "alive",
	work,
});

const soundings = {
	changes: [],
	kind: "piece" as const,
	pieceId: "piece-1",
	pieceTitle: "soundings",
	voyageId: "voyage-1",
	voyageName: "the reef",
};

const card = (
	summary: AgentSummary,
	onNavigate: (target: ConsoleTarget) => void = () => undefined,
) => (
	<AgentCard
		agent={summary}
		onError={() => undefined}
		onNavigate={onNavigate}
		onSelect={() => undefined}
		selected={undefined}
	/>
);

const render = (summary: AgentSummary): string =>
	renderToStaticMarkup(card(summary));

// why: the admiral's complaint was a roster of prompts — a card said what an
// agent was told, never what it was doing. Now the work leads and the charter
// waits behind a disclosure.
it("leads with the piece and the voyage, and demotes the charter", () => {
	const shown = render(agent([soundings]));

	expect(shown.indexOf("soundings")).toBeLessThan(shown.indexOf("the reef"));
	expect(shown.indexOf("the reef")).toBeLessThan(
		shown.indexOf("navigator-of-the-northern-approach"),
	);
	expect(shown).toContain("<details");
	expect(shown.indexOf("<details")).toBeLessThan(
		shown.indexOf("take every depth"),
	);
});

it("names a captain by the voyage it commands", () => {
	const shown = render(
		agent([{ kind: "voyage", voyageId: "voyage-1", voyageName: "the reef" }]),
	);

	expect(shown).toContain("Captain of");
	expect(shown).toContain("the reef");
});

it("lets the role lead when the agent has no work", () => {
	const shown = render(agent([]));

	expect(shown).toContain("navigator-of-the-northern-approach");
	expect(shown).not.toContain("Captain of");
});

// why: the chip speaks the quay's words for a change still at the quay and
// says landed for the one the quay no longer lists.
it("shows where each produced change stands in the quay's words", () => {
	const alongside = render(
		agent([{ ...soundings, changes: [held("alongside")] }]),
	);
	expect(alongside).toContain("#42");
	expect(alongside).toContain("Alongside");
	expect(alongside).toContain('href="https://example.test/shoals/pull/42"');

	const landed = render(agent([{ ...soundings, changes: [held("landed")] }]));
	expect(landed).toContain("Landed");

	const unhosted = render(
		agent([{ ...soundings, changes: [held("draft", null)] }]),
	);
	expect(unhosted).not.toContain("<a ");
	expect(unhosted).toContain("Draft");
});

const settle = (change: () => void): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			change();
			return Promise.resolve();
		}),
	);

const clickTitled = (container: HTMLElement, title: string) =>
	settle(() =>
		container
			.querySelector<HTMLButtonElement>(`button[title="${title}"]`)
			?.click(),
	);

it.effect("opens the piece, and the voyage, on the Voyages page", () =>
	Effect.gen(function* () {
		const targets: Array<ConsoleTarget> = [];
		const container = document.createElement("div");
		const root = createRoot(container);
		yield* settle(() =>
			root.render(
				card(
					agent([
						soundings,
						{ kind: "voyage", voyageId: "voyage-2", voyageName: "the strait" },
					]),
					(target) => targets.push(target),
				),
			),
		);

		yield* clickTitled(container, "Open this piece");
		expect(targets).toEqual([
			{ mode: "voyages", pieceId: "piece-1", voyageId: "voyage-1" },
		]);

		yield* clickTitled(container, "Open this voyage");
		expect(targets.at(-1)).toEqual({
			mode: "voyages",
			pieceId: null,
			voyageId: "voyage-1",
		});
		yield* settle(() => root.unmount());
	}),
);
