import { answered, it } from "@antumbra/app-testing/entry.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { expect } from "vitest";
import { launchPiece } from "#tools/pieces/acts.ts";
import { charterPiece } from "#tools/pieces/charter.ts";
import { readVoyage } from "#tools/voyages/read.ts";

const voyageId = VoyageId.make("reef");
const context = { agentId: "captain", sessionId: "root", callId: "charter", voyageId };
const opening = {
	name: "Reef",
	context: "Uncharted",
	northStar: "Charted",
	kind: "voyage",
	captainBackend: null,
	captainModel: null,
	captainEffort: null,
	crewBackend: null,
	crewModel: null,
	crewEffort: null,
	requestId: Request.make(voyageId),
} as const;
const input = { title: "Soundings", charter: "Sound the reef", expectation: "Depths known", role: "hand", dependsOn: [] };

it.app("replaying a charter call creates one Piece and reads its delivered outcome", function* (app) {
	yield* app.api.voyages.open(opening);
	const first = yield* charterPiece.invoke(context, input);
	expect(first.ok).toBe(true);
	expect((yield* charterPiece.invoke(context, input)).ok).toBe(true);
	const id = PieceId.make(requestId(context));
	expect((yield* answered(app.api.pieces.displayByVoyage({ voyageId }))).map((piece) => piece.id)).toEqual([id]);
	expect(first.text).toContain(`chartered ${id}`);
	expect((yield* launchPiece.invoke({ ...context, callId: "launch" }, { pieceId: id })).text).toContain("launched into the pool");
	yield* app.api.reports.land({ pieceId: id, authorAgentId: null, title: "Depth chart", body: "Every shoal surveyed" });
	const reading = yield* readVoyage.invoke({ ...context, voyageId: "another-voyage" }, { voyageId });
	expect(reading.ok).toBe(true);
	expect(reading.text).toContain("Soundings [done]");
	expect(reading.text).toContain("Depth chart — report");
});

it.app("captain reach refusals leave another Voyage's Piece held", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* charterPiece.invoke(context, input);
	const id = PieceId.make(requestId(context));
	const answer = yield* launchPiece.invoke({ ...context, voyageId: "another-voyage", callId: "launch" }, { pieceId: id });
	expect(answer).toMatchObject({ ok: false });
	expect(answer.text).toContain("that piece is not on your voyage");
	expect(yield* answered(app.api.pieces.progress({ id }))).toMatchObject({ state: "held" });
});
