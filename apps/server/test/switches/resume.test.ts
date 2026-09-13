import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { chartered, crewed, opened, PIECE, VOYAGE } from "#test/switches/kit.ts";

const CREW = Request.make("crew");
const resuming = `Resume assigned piece ${PIECE}`;

it.app("an idle agent is not told to continue its piece while the resume switch is off, and is told when it goes back on", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* chartered(app);
	yield* app.api.agents.request({ requestId: CREW, voyageId: VOYAGE, pieceId: PIECE, role: "crew" });
	yield* app.api.pieces.launch({ id: PIECE });
	yield* app.api.settings.setFlag({ key: "resumePieces", on: false });
	const { sessionId } = yield* atWork(CREW, 0);
	const held = yield* eventually(app.api.agents.dispatch({}), (reading) => reading.ready.length === 1, "one ready piece in the dispatch");
	expect(held.ready).toMatchObject([{ held: true, piece: { id: PIECE } }]);
	expect(yield* answered(app.api.sessions.operations({ sessionId }), "the session's operations to be listed")).toEqual([]);
	const queues = yield* answered(app.api.holds.queues({}), "the hold queues to be listed");
	expect(queues.queues).toMatchObject([{ setting: "resumePieces", held: true, waiting: [{ id: PIECE, title: "Sounding", voyage: "Reef" }] }]);
	yield* app.api.settings.setFlag({ key: "resumePieces", on: true });
	const woken = yield* eventually(app.api.sessions.operations({ sessionId }), (operations) => operations.length === 1, "one operation");
	expect(woken).toMatchObject([{ kind: "wake", reason: resuming, status: "requested" }]);
});
