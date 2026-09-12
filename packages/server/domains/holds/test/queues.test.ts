import { answered, it } from "@antumbra/app-testing/entry.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";

const opening = {
	requestId: Id.Request.make("voyage"),
	name: "Reef",
	context: "Sound the reef",
	northStar: "Safe passage",
	kind: "voyage",
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
} as const;
const chartering = {
	requestId: Id.Request.make("piece"),
	voyageId: VoyageId.make("voyage"),
	title: "Sound",
	charter: "Sound the passage",
	expectation: "Chart",
	role: "hand",
	dependsOn: [],
} as const;

it.app("keeps ready pieces visible while held and removes them when gated", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.pieces.launch({ id: PieceId.make("piece") });
	yield* app.api.settings.setFlag({ key: "holdPieceDispatch", on: true });
	const held = yield* answered(app.api.holds.queues({}));
	expect(held.queues[0]).toMatchObject({ held: true, waiting: [{ id: "piece", title: "Sound", voyage: "Reef" }] });
	yield* app.api.rulings.request({
		requester: { kind: "authority", by: "admiral" },
		rung: "admiral",
		question: "Which passage?",
		context: "Rocks ahead",
		radius: "piece",
		urgency: "pressing",
		choices: [],
		subjects: [],
		gates: [PieceId.make("piece")],
		recommendation: null,
	});
	const gated = yield* answered(app.api.holds.queues({}));
	expect(gated.queues[0]?.waiting).toEqual([]);
	expect(gated.queues.map((queue) => queue.kind)).toEqual(["dispatch", "wake"]);
});
