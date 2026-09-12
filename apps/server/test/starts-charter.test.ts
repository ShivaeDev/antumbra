import { answered, it } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { charter } from "#starts/charter.ts";

it.app("birth charters carry scoped Boards, binding rulings, and landed Piece outcomes", function* (app) {
	const voyageId = VoyageId.make("voyage");
	const pieceId = PieceId.make("piece");
	yield* app.api.voyages.open({
		requestId: Request.make(voyageId),
		name: "Reef",
		northStar: "Safe passage",
		context: "Survey before sailing",
		kind: "voyage",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
	});
	yield* app.api.pieces.charter({
		requestId: Request.make(pieceId),
		voyageId,
		title: "Soundings",
		charter: "Measure the eastern shoal",
		expectation: "A depth chart",
		role: "crew",
		dependsOn: [],
	});
	yield* app.api.boards.write({ board: voyageBoard(voyageId), author: null, register: "rough", body: "Tide rises at dusk" });
	yield* app.api.boards.write({ board: pieceBoard(pieceId), author: null, register: "rough", body: "The buoy has moved north" });
	yield* app.api.rulings.proclaim({
		by: "admiral",
		answer: "Leave the protected inlet untouched",
		tags: "",
		chosenChoice: null,
		question: "Which inlet may we survey?",
		context: "Habitat survey",
		radius: "fleet",
		urgency: "blocking",
		choices: [],
		subjects: [],
	});
	yield* app.api.reports.land({ pieceId, authorAgentId: null, title: "Shoal survey result", body: "The east passage is clear" });
	const voyage = yield* answered(app.api.voyages.byId({ id: voyageId }));
	const piece = yield* answered(app.api.pieces.byId({ id: pieceId }));
	if (voyage === null || piece === null) return yield* Effect.die("Missing charter source");
	const crew = yield* charter(AgentId.make("crew"), voyage, piece);
	for (const included of [
		voyage.context,
		voyage.northStar,
		piece.charter,
		piece.expectation,
		"Tide rises at dusk",
		"The buoy has moved north",
		"Leave the protected inlet untouched",
	])
		expect(crew).toContain(included);
	const captain = yield* charter(AgentId.make("captain"), voyage, null);
	expect(captain).toContain("Shoal survey result");
	expect(captain).toContain("Tide rises at dusk");
	expect(captain).toContain("Leave the protected inlet untouched");
	expect(captain).not.toContain("The buoy has moved north");
});
