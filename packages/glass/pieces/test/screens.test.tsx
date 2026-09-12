import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { CharterPiece } from "#charter-piece.tsx";
import { PieceActs } from "#piece-acts.tsx";
import { RewirePiece } from "#rewire-piece.tsx";
import { CHARTS, type Desk, desk, SOUNDINGS, VOYAGE } from "#test/desk.ts";
import { choose, mount, settle, until } from "#test/dom.ts";

const shown = (board: Desk, island: ReactNode) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(<board.glass.Provider>{island}</board.glass.Provider>));
		return container;
	});

const labelled = <Element extends HTMLElement>(container: HTMLElement, label: string): Element =>
	container.querySelector<Element>(`[aria-label="${label}"]`) ?? Effect.runSync(Effect.die(`no control labelled ${label}`));

const pressing = (container: HTMLElement, words: string) =>
	settle(() => {
		for (const button of container.querySelectorAll("button")) {
			if (button.textContent === words) {
				button.click();
			}
		}
	});

it.live("draws the charter form with the voyage's pieces offered as what the new piece waits on", () =>
	Effect.gen(function* () {
		const board = desk();
		const container = yield* shown(board, <CharterPiece api={board.glass.api} onChartered={() => undefined} voyageId={VOYAGE} />);
		yield* until(() => container.querySelectorAll("form").length > 0);

		expect([...container.querySelectorAll("div > span[aria-hidden]")].map((title) => title.textContent)).toEqual([
			"Title",
			"Charter",
			"Expectation",
			"Role",
			"Depends on",
		]);
		const waits = labelled<HTMLSelectElement>(container, "Charter piece Depends on");
		expect(waits.multiple).toBe(true);
		yield* until(() => waits.options.length === 2);
		expect([...waits.options].map((option) => option.textContent)).toEqual(["Soundings", "Charts"]);
	}),
);

it.live("puts a cycle the server refuses on the field that carries what a piece waits on", () =>
	Effect.gen(function* () {
		const board = desk();
		const piece = { dependsOn: [CHARTS], id: SOUNDINGS, title: "Soundings", voyageId: VOYAGE };
		const container = yield* shown(board, <RewirePiece api={board.glass.api} piece={piece} />);
		const waits = labelled<HTMLSelectElement>(container, "Soundings Depends on");
		yield* until(() => waits.options.length === 2);
		expect([...waits.options].filter((option) => option.selected).map((option) => option.value)).toEqual([CHARTS]);

		yield* settle(() => choose(waits, [SOUNDINGS]));
		yield* pressing(container, "Save position");

		yield* until(() => waits.getAttribute("aria-invalid") === "true");
		expect(container.textContent).toContain("A piece cannot wait on work that waits on it");
		expect(board.said).toEqual([]);
	}),
);

it.live("offers the acts a piece stands ready for and sends the one pressed", () =>
	Effect.gen(function* () {
		const board = desk();
		const piece = { id: SOUNDINGS, launchedAt: null, parkedAt: null };
		const container = yield* shown(board, <PieceActs api={board.glass.api} piece={piece} />);

		expect([...container.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["Launch", "Park"]);
		yield* pressing(container, "Launch");

		yield* until(() => board.said.length === 1);
		expect(board.said[0]).toMatchObject({ command: "launch", input: { id: SOUNDINGS } });
	}),
);
