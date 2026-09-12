import { settle } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { reefView } from "@antumbra/contract/fixtures";
import { expect } from "@effect/vitest";
import { GlassContext } from "#adapters/glass.ts";
import { BoardPanel } from "#views/board.tsx";

const SUMMARY = "The northern shoals were sounded and the depths recorded; the chart of the eastern channel is still open.";

it.glass("stands a Piece summary as the smoother's word on the Piece it settles", function* ({ api, render }) {
	const container = yield* render(
		<GlassContext value={api}>
			<BoardPanel
				entries={reefView.board}
				name={reefView.name}
				onPiece={() => undefined}
				pieces={reefView.pieces}
				scope={{ kind: "voyage", voyageId: reefView.id }}
			/>
		</GlassContext>,
	);
	yield* settle(() => container.querySelector("button")?.click());

	expect(container.textContent).toContain("Piece summary");
	expect(container.textContent).toContain("Smoother");
	expect(container.textContent).toContain("soundings");
	expect(container.textContent).toContain(SUMMARY);
	expect(container.textContent).not.toContain("agent-3");
});

it.glass("opens the Piece a summary settles", function* ({ api, render }) {
	const asked: Array<string> = [];
	const container = yield* render(
		<GlassContext value={api}>
			<BoardPanel
				entries={reefView.board}
				name={reefView.name}
				onPiece={(pieceId) => asked.push(pieceId)}
				pieces={reefView.pieces}
				scope={{ kind: "voyage", voyageId: reefView.id }}
			/>
		</GlassContext>,
	);
	yield* settle(() => container.querySelector("button")?.click());

	yield* settle(() => [...container.querySelectorAll("button")].find((button) => button.textContent === "soundings")?.click());

	expect(asked).toEqual(["piece-1"]);
});
