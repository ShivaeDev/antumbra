import type { BoardEntryView } from "@antumbra/contract";
import { reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { mount, settle } from "#test/dom.ts";
import { BoardPanel } from "#views/board.tsx";

const SUMMARY = "The northern shoals were sounded; the eastern channel is still unmeasured.";

const entries: ReadonlyArray<BoardEntryView> = [
	{
		authorAgentId: "agent-smoother",
		body: SUMMARY,
		createdAt: "2026-08-15T12:20:00.000Z",
		id: "entry-piece-summary",
		pieceId: "piece-1",
		register: "rough",
	},
];

const opened = (onPiece: (pieceId: string) => void) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() =>
			root.render(<BoardPanel entries={entries} onPiece={onPiece} pieces={reefView.pieces} scope={{ kind: "voyage", voyageId: "voyage-1" }} />),
		);
		yield* settle(() => container.querySelector("button")?.click());
		return container;
	});

it.effect("names a Piece summary by its kind, its author, and the Piece it settles", () =>
	Effect.gen(function* () {
		const container = yield* opened(() => undefined);

		expect(container.textContent).toContain("Piece summary");
		expect(container.textContent).toContain("Smoother");
		expect(container.textContent).toContain("soundings");
		expect(container.textContent).toContain(SUMMARY);
		expect(container.textContent).not.toContain("agent-sm");
	}),
);

it.effect("opens the Piece a summary settles", () =>
	Effect.gen(function* () {
		const asked: Array<string> = [];
		const container = yield* opened((pieceId) => asked.push(pieceId));

		yield* settle(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "soundings")?.click());

		expect(asked).toEqual(["piece-1"]);
	}),
);
