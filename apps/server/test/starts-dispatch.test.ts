import { answered, it } from "@antumbra/app-testing/entry.ts";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";

it.app("dispatch queues eligible work once and cancels its pending birth when parked", function* (app) {
	const voyageId = VoyageId.make("voyage");
	const prerequisite = PieceId.make("prerequisite");
	const dependant = PieceId.make("dependant");
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
	expect((yield* answered(app.api.starts.dispatch({}))).ready.map((candidate) => candidate.piece.id)).toEqual([prerequisite]);
	yield* app.api.starts.request({
		requestId: Request.make("birth"),
		agentId: AgentId.make("agent"),
		sessionId: SessionId.make("session"),
		voyageId,
		pieceId: prerequisite,
		source: "dispatch",
		backend: "claude",
		model: null,
		effort: null,
		role: "crew",
		charter: "Survey",
		toolSetVersion: "crew-v1",
		tools: [],
	});
	expect((yield* answered(app.api.starts.dispatch({}))).ready).toEqual([]);
	yield* app.api.pieces.park({ id: prerequisite });
	expect((yield* answered(app.api.starts.dispatch({}))).cancel.map((birth) => birth.id)).toEqual(["birth"]);
});
