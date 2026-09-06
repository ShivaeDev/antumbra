import { reefView } from "@antumbra/contract/fixtures";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { mount, settle } from "#test/dom.ts";
import { BoardPanel } from "#views/board.tsx";

const SUMMARY = "The northern shoals were sounded and the depths recorded; the chart of the eastern channel is still open.";

const opened = (onPiece: (pieceId: string) => void) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() =>
			root.render(
				<BoardPanel
					entries={reefView.board}
					name={reefView.name}
					onPiece={onPiece}
					pieces={reefView.pieces}
					scope={{ kind: "voyage", voyageId: reefView.id }}
				/>,
			),
		);
		yield* settle(() => container.querySelector("button")?.click());
		return container;
	});

it.effect("stands a Piece summary as the smoother's word on the Piece it settles", () =>
	Effect.gen(function* () {
		const container = yield* opened(() => undefined);

		expect(container.textContent).toContain("Piece summary");
		expect(container.textContent).toContain("Smoother");
		expect(container.textContent).toContain("soundings");
		expect(container.textContent).toContain(SUMMARY);
		expect(container.textContent).not.toContain("agent-3");
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
