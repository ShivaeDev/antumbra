import { answered, it } from "@antumbra/app-testing/entry.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { Charter } from "@antumbra/domain-agents/ports/charter.ts";
import { pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";

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
	const charter = yield* Charter;
	const born = Effect.fn("CharterTest.born")(function* (requestId: string) {
		const held = yield* answered(app.api.agents.birthBySession({ sessionId: identity(Request.make(requestId)).sessionId }));
		if (held === null) return yield* Effect.die(`the ${requestId} birth was not recorded`);
		return held;
	});
	yield* app.api.agents.request({ requestId: Request.make("crew"), voyageId, pieceId, role: "crew" });
	yield* app.api.agents.hail({ requestId: Request.make("captain"), voyageId });
	const { text: crew } = yield* charter.compose(yield* born("crew"));
	for (const included of [
		"Survey before sailing",
		"Safe passage",
		"Measure the eastern shoal",
		"A depth chart",
		"Tide rises at dusk",
		"The buoy has moved north",
		"Leave the protected inlet untouched",
	])
		expect(crew).toContain(included);
	const { text: captain } = yield* charter.compose(yield* born("captain"));
	expect(captain).toContain("Shoal survey result");
	expect(captain).toContain("Tide rises at dusk");
	expect(captain).toContain("Leave the protected inlet untouched");
	expect(captain).not.toContain("The buoy has moved north");
});
