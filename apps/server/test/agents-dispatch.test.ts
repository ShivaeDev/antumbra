import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";

it.app("dispatch queues eligible work once and cancels its pending birth when parked", function* (app) {
	const voyageId = VoyageId.make("voyage");
	const prerequisite = PieceId.make("prerequisite");
	const dependant = PieceId.make("dependant");
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 1 });
	yield* app.api.agents.spawn({ requestId: Request.make("occupying"), role: "crew", backend: "claude", model: null, effort: null });
	yield* eventually(app.api.agents.admitted({}), (births) => births.some((birth) => birth.id === "occupying"));
	yield* app.api.voyages.open({
		requestId: Request.make(voyageId),
		name: "Reef",
		northStar: "Safe passage",
		context: "Survey",
		kind: "voyage",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
	});
	for (const id of [prerequisite, dependant]) {
		yield* app.api.pieces.charter({
			requestId: Request.make(id),
			voyageId,
			title: id,
			charter: "Survey",
			expectation: "Chart",
			role: "crew",
			dependsOn: id === dependant ? [prerequisite] : [],
		});
		yield* app.api.pieces.launch({ id });
	}
	const queued = yield* eventually(app.api.agents.births({}), (births) => births.some((birth) => birth.pieceId === prerequisite));
	expect(queued.filter((birth) => birth.pieceId !== null)).toMatchObject([{ pieceId: prerequisite, source: "dispatch", status: "requested" }]);
	const pending = queued.find((birth) => birth.pieceId === prerequisite);
	expect((yield* answered(app.api.agents.dispatch({}))).ready).toEqual([]);
	yield* app.api.pieces.park({ id: prerequisite });
	expect(
		yield* eventually(app.api.agents.births({}), (births) => births.some((birth) => birth.id === pending?.id && birth.status === "cancelled")),
	).toEqual(expect.arrayContaining([expect.objectContaining({ id: pending?.id, status: "cancelled" })]));
});
