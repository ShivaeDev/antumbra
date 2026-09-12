import { answered, it } from "@antumbra/app-testing/entry.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { requestId } from "@antumbra/platform-tool-schemas/request.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";

const voyageId = VoyageId.make("voyage:reef");
const pieceId = PieceId.make("piece:reef");
const opening = {
	requestId: Id.Request.make(voyageId),
	kind: "voyage",
	name: "Reef",
	northStar: "Safe passage",
	context: "Sound the reef",
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
} as const;
const chartering = {
	requestId: Id.Request.make(pieceId),
	voyageId,
	title: "Reef chart",
	charter: "Make a chart",
	expectation: "A chart",
	role: "hand",
	dependsOn: [],
};

import { landArtifactTool } from "#tools/artifacts/land.ts";
import { removeArtifactSupersessionTool, supersedeArtifactTool } from "#tools/artifacts/lineage.ts";

it.app("artifact tools bind authors and keep replacement corrections", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	app.artifacts.source.set("old.md", "# Old soundings");
	app.artifacts.source.set("new.md", "# New soundings");
	const context = { agentId: "agent:cartographer", sessionId: "session:chart", callId: "artifact:old", pieceId };
	const first = { path: "old.md", title: "Old chart" };
	expect(yield* landArtifactTool.invoke(context, first)).toMatchObject({ ok: true });
	expect(yield* landArtifactTool.invoke({ ...context, callId: "artifact:new" }, { path: "new.md", title: "New chart" })).toMatchObject({ ok: true });
	const old = requestId(context);
	const next = requestId({ ...context, callId: "artifact:new" });
	const edge = { supersededArtifactId: old, successorArtifactId: next };
	expect(yield* supersedeArtifactTool.invoke({ ...context, callId: "replace" }, edge)).toMatchObject({ ok: true });
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).history).toMatchObject([{ authorAgentId: context.agentId, id: old }]);
	expect(yield* removeArtifactSupersessionTool.invoke({ ...context, callId: "correct" }, edge)).toMatchObject({ ok: true });
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toHaveLength(2);
});

it.app("a repeated landing can answer after its source is gone", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	app.artifacts.source.set("old.md", "# Old soundings");
	app.artifacts.source.set("new.md", "# New soundings");
	const context = { agentId: "agent:cartographer", sessionId: "session:chart", callId: "artifact:chart", pieceId };
	const input = { path: "old.md", title: "Chart" };
	const first = yield* landArtifactTool.invoke(context, input);
	app.artifacts.source.clear();
	expect(yield* landArtifactTool.invoke(context, input)).toEqual(first);
	expect((yield* answered(app.api.artifacts.byPiece({ pieceId }))).current).toHaveLength(1);
});
