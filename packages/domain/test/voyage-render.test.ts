import { expect, it } from "@effect/vitest";
import { piece, world } from "#test/piece-ladder-fixtures.ts";
import { renderVoyage } from "#voyage-render.ts";
import type { VoyageRow } from "#voyage-rows.ts";
import { voyageView } from "#voyage-view.ts";

const reef: VoyageRow = {
	captainBackend: "scripted",
	context: "the reef is uncharted",
	crewBackend: "scripted",
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
			voyages: [reef],
		}),
		reef,
	);
	const rendered = renderVoyage(view);

	expect(rendered).toContain("- bravo bravo [done] depends on alpha");
	expect(rendered).toContain("- report-1 eastern chart — report by agent-hand");
	expect(rendered).toContain("## Captain\n- captain-1 [alive]");
});
