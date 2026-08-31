// @vitest-environment happy-dom

import type { PieceView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { PieceCard } from "#views/piece-card.tsx";

const charter = [
	"# Sound the shoals",
	"",
	"Take **every** depth along the northern edge, then:",
	"",
	"- log each sounding",
	"- mark the ones under `three fathoms`",
].join("\n");

const soundings: PieceView = {
	agents: [],
	artifactHistory: [],
	artifacts: [],
	awaitingRulings: [{ question: "which reef?", rulingId: "ruling-1" }],
	board: [
		{
			authorAgentId: null,
			body: "## Log entry\n\nFound **two** shoals.",
			createdAt: "2026-08-15T09:10:00.000Z",
			id: "entry-1",
			register: "smooth",
		},
	],
	canRetireCrew: false,
	changes: [],
	charter,
	dependsOn: ["piece-2"],
	expectation: "the depths are recorded",
	id: "piece-1",
	launchedAt: null,
	parkedAt: null,
	reports: [],
	role: "hand",
	state: "held",
	title: "soundings",
};

const chart: PieceView = {
	...soundings,
	charter: "draw the chart",
	dependsOn: [],
	id: "piece-2",
	title: "the chart",
};

const pieces = [soundings, chart];

const card = (piece: PieceView): React.ReactElement => <PieceCard onError={() => undefined} piece={piece} pieces={pieces} />;

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const render = (root: Root, piece: PieceView): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			root.render(card(piece));
			return Promise.resolve();
		}),
	);

const open = (container: HTMLElement): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			container.querySelector("button")?.click();
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

it("says who the piece is and where it stands in one line", () => {
	const shown = renderToStaticMarkup(card(soundings));

	expect(shown).toContain("soundings");
	expect(shown).toContain("hand");
	expect(shown).toContain("Held");
	expect(shown).toContain("Sound the shoals Take every depth");
});

it("previews a charter as words, never as the marks it was written with", () => {
	const shown = renderToStaticMarkup(card(soundings));

	expect(shown).not.toContain("# Sound");
	expect(shown).not.toContain("**");
	expect(shown).not.toContain("<h1");
	expect(shown).not.toContain("<li>");
});

it("holds the charter, the ladder and the acts until the card is opened", () => {
	const shown = renderToStaticMarkup(card(soundings));

	expect(shown).not.toContain("Depends on");
	expect(shown).not.toContain("Awaiting ruling");
	expect(shown).not.toContain("Launch");
	expect(shown).toContain('aria-expanded="false"');
});

it("keeps a charter inside the card however long its words run", () => {
	const path = "/Users/navigator/charts/packages/renderer/src/views/piece.tsx";
	const shown = renderToStaticMarkup(card({ ...soundings, charter: `- ${path}\n- ${path}` }));

	expect(shown).toContain(`${path} ${path}`);
	expect(shown).toContain("truncate");
});

it.effect("reads the charter as the document it is once opened", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, soundings);

		yield* open(container);

		const shown = container.innerHTML;
		expect(shown).toContain("markdown");
		expect(shown).toContain("<h1>Sound the shoals</h1>");
		expect(shown).toContain("<strong>every</strong>");
		expect(shown).toContain("<code>three fathoms</code>");
		expect(container.textContent).toContain("Depends on: the chart");
		expect(container.textContent).toContain("Awaiting ruling ruling-1: which reef?");
		expect(container.textContent).toContain("Launch");
		expect(container.textContent).toContain("Board");
		expect(container.innerHTML).not.toContain("<h2>Log entry</h2>");
		yield* drop(root);
	}),
);

it.effect("exposes the piece log through the same collapsed Markdown control", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, soundings);
		yield* open(container);

		const board = container.querySelector<HTMLButtonElement>('button[title="Show the board"]');
		expect(board).not.toBeNull();
		yield* Effect.promise(() =>
			act(() => {
				board?.click();
				return Promise.resolve();
			}),
		);

		expect(container.innerHTML).toContain("<h2>Log entry</h2>");
		expect(container.innerHTML).toContain("<strong>two</strong>");
		expect(container.textContent).toContain("Write to the board");
		yield* drop(root);
	}),
);

it.effect("closes again on the reader's word", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* render(root, soundings);

		yield* open(container);
		yield* open(container);

		expect(container.innerHTML).not.toContain("<h1>");
		expect(container.textContent).not.toContain("Depends on");
		yield* drop(root);
	}),
);
