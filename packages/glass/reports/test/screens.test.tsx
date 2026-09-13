import { eventually } from "@antumbra/app-testing/answers.ts";
import { click, labelled, press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { RECONNECTING, Reconnecting } from "@antumbra/glass-client/reconnection.tsx";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { ReportOutcomes, ReportReferences } from "#report-outcomes.tsx";

const UNREACHED = "The server could not be reached";

const said = (container: HTMLElement): string | null | undefined => container.querySelector('[role="status"]')?.textContent;

const reef = VoyageId.make("voyage:reef");
const soundings = PieceId.make("piece:soundings");
const opening = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "the reef is uncharted",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage",
	name: "Chart the reef",
	northStar: "every shoal is known",
	requestId: Id.Request.make(reef),
} as const;

it.glass("a landed report appears on its Piece and opens its body and author", function* ({ api, render }) {
	yield* api.voyages.open(opening);
	yield* api.pieces.charter({
		charter: "sound the reef",
		dependsOn: [],
		expectation: "soundings land",
		requestId: Id.Request.make(soundings),
		role: "hand",
		title: "Soundings",
		voyageId: reef,
	});
	const container = yield* render(<ReportOutcomes api={api} pieceId={soundings} />);
	yield* api.reports.land({
		authorAgentId: "agent-surveyor",
		body: "The **eastern shoal** is steeper than charted.",
		pieceId: soundings,
		title: "Reef soundings",
	});
	yield* until(() => container.textContent?.includes("Reef soundings") === true, "the landed report chip");
	yield* press(container, "Reef soundings");
	yield* until(() => container.textContent?.includes("steeper than charted") === true, "the report body");
	expect(container.querySelector("strong")?.textContent).toBe("eastern shoal");
	expect(container.textContent).toContain("Reef soundings — report by agent-surveyor");
	yield* click(labelled(container, "Close"));
	expect(container.textContent).not.toContain("steeper than charted");
	expect(container.textContent).toContain("Reef soundings");
});

it.glass("a missing report names the failed reading and can be closed", function* ({ api, render }) {
	const container = yield* render(<ReportReferences api={api} reports={[{ id: "missing", title: "Old soundings" }]} />);
	yield* press(container, "Old soundings");
	yield* until(() => container.textContent?.includes("no such report: missing") === true, "the missing report message");
	yield* click(labelled(container, "Close"));
	expect(container.textContent).not.toContain("no such report");
});

it.glass("keeps an open report on the page while the server is away", function* ({ api, render, server }) {
	yield* api.voyages.open(opening);
	yield* api.pieces.charter({
		charter: "sound the reef",
		dependsOn: [],
		expectation: "soundings land",
		requestId: Id.Request.make(soundings),
		role: "hand",
		title: "Soundings",
		voyageId: reef,
	});
	yield* api.reports.land({
		authorAgentId: null,
		body: "The **eastern shoal** is steeper than charted.",
		pieceId: soundings,
		title: "Reef soundings",
	});
	const landed = yield* eventually(api.reports.byPiece({ pieceId: soundings }), (reports) => reports.length === 1);
	const container = yield* render(
		<>
			<ReportReferences api={api} reports={landed.map((report) => ({ id: report.id, title: report.title }))} />
			<Reconnecting />
		</>,
	);
	yield* press(container, "Reef soundings");
	yield* until(() => container.textContent?.includes("steeper than charted") === true, "the report body");

	yield* server.away;
	yield* until(() => said(container) === RECONNECTING, "the pane to hold the report it read");
	expect(container.textContent).toContain("steeper than charted");
	expect(container.textContent).not.toContain(UNREACHED);

	yield* server.back;
	yield* until(() => said(container) === "", "the pane to take the report again");
	expect(container.textContent).toContain("steeper than charted");
});
