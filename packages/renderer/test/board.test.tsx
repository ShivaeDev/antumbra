import type { BoardEntryView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { mount, settle } from "#test/dom.ts";
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

const panel = () => <BoardPanel entries={entries} scope={{ kind: "voyage", voyageId: "voyage-1" }} />;

const clickHeading = (container: HTMLElement): Effect.Effect<void> => settle(() => container.querySelector("button")?.click());

it.effect("keeps a log collapsed until asked, then reads its entries as Markdown", () =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(panel()));

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
	}),
);
