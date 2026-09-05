import { expect, it } from "@effect/vitest";
import { piece, world } from "#test/piece-ladder-fixtures.ts";
import { renderVoyage } from "#voyage-render.ts";
import type { VoyageRow } from "#voyage-rows.ts";
import { voyageView } from "#voyage-view.ts";

const reef: VoyageRow = {
	context: "the reef is uncharted",
	focusedAt: null,
	id: "voyage-1",
	kind: "voyage",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

it("renders dependency, report authorship, and captain status for an agent", () => {
	const view = voyageView(
		world({
			agentStatus: new Map([["captain-1", "alive"]]),
			crews: [{ agentId: "captain-1", role: "captain", voyageId: reef.id }],
			edges: [{ fromPieceId: "alpha", toPieceId: "bravo" }],
			memberships: [
				{ pieceId: "alpha", voyageId: reef.id },
				{ pieceId: "bravo", voyageId: reef.id },
			],
			pieceReports: [{ pieceId: "bravo", reportId: "report-1" }],
			pieces: [piece("alpha"), piece("bravo")],
			reports: new Map([
				[
					"report-1",
					{
						authorAgentId: "agent-hand",
						body: "the eastern chart is complete",
						id: "report-1",
						title: "eastern chart",
					},
				],
			]),
		}),
		reef,
	);
	const rendered = renderVoyage(view, { limit: 4, running: 0, unlaunched: 0, waiting: 2 });

	expect(rendered).toContain("this voyage has 0 pieces running and 2 waiting for capacity; the fleet runs at most 4 agents at once");
	expect(rendered).toContain("- bravo bravo [done] depends on alpha");
	expect(rendered).toContain("- report-1 eastern chart — report by agent-hand");
	expect(rendered).toContain("## Captain\n- captain-1 [alive]");
});
