// why: @vitest-environment happy-dom opens a log the way a reader opens it.

import type { BoardEntryView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { BoardPanel } from "#views/board.tsx";

const entries: ReadonlyArray<BoardEntryView> = [
	{
		authorAgentId: null,
		body: "# Soundings\n\nMark the **shallow** water.",
		createdAt: "2026-08-15T09:10:00.000Z",
		id: "entry-1",
		register: "smooth",
	},
];

const panel = () => <BoardPanel entries={entries} onError={() => undefined} scope={{ kind: "voyage", voyageId: "voyage-1" }} />;

const mount = (): { container: HTMLElement; root: Root } => {
	const container = document.createElement("div");
	return { container, root: createRoot(container) };
};

const clickHeading = (container: HTMLElement): Effect.Effect<void> =>
	Effect.promise(() =>
		act(() => {
			container.querySelector("button")?.click();
			return Promise.resolve();
		}),
	);

it.effect("keeps a log collapsed until asked, then reads its entries as Markdown", () =>
	Effect.gen(function* () {
		const { container, root } = mount();
		yield* Effect.promise(() =>
			act(() => {
				root.render(panel());
				return Promise.resolve();
			}),
		);

		expect(container.innerHTML).toContain('aria-expanded="false"');
		expect(container.innerHTML).not.toContain("<h1>");
		expect(container.textContent).not.toContain("Write to the board");

		yield* clickHeading(container);

		expect(container.innerHTML).toContain('aria-expanded="true"');
		expect(container.innerHTML).toContain("<h1>Soundings</h1>");
		expect(container.innerHTML).toContain("<strong>shallow</strong>");
		expect(container.textContent).toContain("Write to the board");

		yield* clickHeading(container);
		expect(container.innerHTML).not.toContain("<h1>");
		yield* Effect.promise(() =>
			act(() => {
				root.unmount();
				return Promise.resolve();
			}),
		);
	}),
);
