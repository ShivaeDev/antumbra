import { type App, answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { lifecycleClient } from "@antumbra/app-testing/lifecycle.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { mailWords } from "@antumbra/platform-prompts/mail.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import type { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { type PrepareSmoother, smoothing } from "#smoothing/run.ts";
import { chartered, crewed, opened, PIECE, RUNNER, VOYAGE } from "#test/switches/kit.ts";
import { writeSummaryTool } from "#tools/boards/summary.ts";

const CREW = Request.make("crew");
const MAIL = Request.make("mail");
const BAR = VoyageId.make("bar");
const BAR_PIECE = PieceId.make("bar-sounding");
const BAR_CREW = Request.make("bar-crew");

const prepare: PrepareSmoother<Commit | Live> = (attempt) => {
	const context = { agentId: `smoother-${attempt.id}`, sessionId: `session-${attempt.id}`, callId: `call-${attempt.id}` };
	return Effect.succeed({
		agentId: context.agentId,
		sessionId: context.sessionId,
		start: writeSummaryTool.invoke(context, { text: "The approach changed with the tide" }).pipe(Effect.asVoid),
		stop: Effect.void,
	});
};

const resuming = `Resume assigned piece ${PIECE}`;

const bar = (app: App) =>
	Effect.gen(function* () {
		yield* app.api.voyages.open({
			requestId: Request.make(BAR),
			name: "Sound the bar",
			northStar: "The bar is sounded",
			context: "Survey",
			kind: "voyage",
			captainBackend: null,
			captainModel: null,
			captainEffort: null,
			crewBackend: null,
			crewModel: null,
			crewEffort: null,
		});
		yield* app.api.pieces.charter({
			requestId: Request.make(BAR_PIECE),
			voyageId: BAR,
			title: "Bar sounding",
			charter: "Sound the bar",
			expectation: "A chart",
			role: "crew",
			dependsOn: [],
		});
	});

it.app("a quieted voyage holds its ready piece while another voyage is still told to continue", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* chartered(app);
	yield* bar(app);
	yield* app.api.agents.workNow({ requestId: CREW, pieceId: PIECE });
	const crew = yield* atWork(CREW, 0);
	yield* app.api.agents.workNow({ requestId: BAR_CREW, pieceId: BAR_PIECE });
	const other = yield* atWork(BAR_CREW, 10);

	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* app.api.pieces.launch({ id: PIECE });
	yield* app.api.pieces.launch({ id: BAR_PIECE });

	const sailed = yield* eventually(
		app.api.sessions.operations({ sessionId: other.sessionId }),
		(held) => held.length === 1,
		"the other voyage's wake",
	);
	expect(sailed).toMatchObject([{ kind: "wake", reason: `Resume assigned piece ${BAR_PIECE}` }]);
	const ready = yield* answered(app.api.agents.dispatch({}), "the dispatch to be read");
	expect(ready.ready).toMatchObject([{ held: true, piece: { id: PIECE } }]);
	expect(yield* answered(app.api.sessions.operations({ sessionId: crew.sessionId }), "the quieted session's operations")).toEqual([]);
	const queues = yield* answered(app.api.holds.queues({}), "the hold queues to be listed");
	expect(queues.quieted).toMatchObject([{ id: VOYAGE, name: "Reef", waiting: [{ id: PIECE, title: "Sounding" }] }]);
	expect(queues.queues).toEqual([]);

	yield* app.api.voyages.resume({ id: VOYAGE });
	const woken = yield* eventually(app.api.sessions.operations({ sessionId: crew.sessionId }), (held) => held.length === 1, "the resumed wake");
	expect(woken).toMatchObject([{ kind: "wake", reason: resuming }]);
});

it.app("a launched piece of a quieted voyage gets no agent until the voyage resumes", function* (app) {
	yield* crewed(app);
	yield* opened(app);
	yield* chartered(app);
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* app.api.pieces.launch({ id: PIECE });
	yield* app.settle();
	expect((yield* answered(app.api.agents.births({}), "the births to be listed")).filter((born) => born.pieceId !== null)).toEqual([]);
	yield* app.api.voyages.resume({ id: VOYAGE });
	yield* eventually(app.api.agents.births({}), (births) => births.some((born) => born.pieceId === PIECE), "the piece's birth to appear");
});

it.app("mail to a quieted voyage's agent lands and stays due until the voyage resumes", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* chartered(app);
	yield* app.api.agents.workNow({ requestId: CREW, pieceId: PIECE });
	const crew = yield* atWork(CREW, 0);
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* app.api.mail.send({
		authorAgentId: null,
		body: "the reef is closed to deep draught",
		precedence: "priority",
		requestId: MAIL,
		toAgentId: crew.agentId,
	});
	yield* app.settle();
	const due = yield* answered(app.api.mail.dueWakes({}), "the due wakes to be listed");
	expect(due.wakes).toMatchObject([{ sessionId: crew.sessionId, voyageId: VOYAGE }]);
	expect(yield* answered(app.api.mail.mailbox({ agentId: crew.agentId }), "the agent's mailbox")).toHaveLength(1);
	expect(yield* answered(app.api.sessions.operations({ sessionId: crew.sessionId }), "the quieted session's operations")).toEqual([]);
	const queues = yield* answered(app.api.holds.queues({}), "the hold queues to be listed");
	expect(queues.quieted).toMatchObject([{ name: "Reef", waiting: [{ id: crew.sessionId, mail: { count: 1, precedence: "priority" } }] }]);

	yield* app.api.voyages.resume({ id: VOYAGE });
	const woken = yield* eventually(app.api.sessions.operations({ sessionId: crew.sessionId }), (held) => held.length === 1, "the mail wake");
	expect(woken).toMatchObject([{ kind: "wake", reason: mailWords({ count: 1, precedence: "priority" }) }]);
});

it.app("a restart does not wake a quieted voyage's roots", function* (app) {
	const { runner } = yield* crewed(app);
	const lifecycle = yield* lifecycleClient;
	yield* opened(app);
	yield* chartered(app);
	yield* app.api.agents.workNow({ requestId: CREW, pieceId: PIECE });
	const { agentId, sessionId } = identity(CREW);
	yield* eventually(app.api.agents.birthBySession({ sessionId }), (held) => held?.status === "admitted", "the birth to be admitted");
	yield* runner.append([
		{
			logId: RUNNER.logId,
			at: 100,
			cursor: 0,
			event: {
				type: "SessionStarted",
				sessionId,
				requestId: String(CREW),
				agentId,
				backend: "claude",
				cwd: "/moorage",
				nativeRef: `native-${sessionId}`,
				runnerId: RUNNER.runnerId,
				toolSetVersion: "crew-v1",
			},
		},
		{
			logId: RUNNER.logId,
			at: 100,
			cursor: 1,
			event: { type: "InputAccepted", sessionId, requestId: String(CREW), inputId: `charter-${sessionId}` },
		},
	]);
	yield* eventually(app.api.agents.reading({ id: agentId }), (reading) => reading?.state === "working", "the agent to be mid-turn");
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* lifecycle("lifecycle.recordRestart", { requestId: "record" });
	expect(yield* answered(app.api.lifecycle.pending({}), "the pending sessions to be listed")).toEqual([sessionId]);
	yield* lifecycle("lifecycle.honorRestart", { requestId: "honor" });
	yield* app.settle();
	expect(yield* answered(app.api.sessions.operations({ sessionId }), "the quieted session's operations")).toEqual([]);
});

it.app("the hold survives a rebuild from the journal", function* (app) {
	yield* opened(app);
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* (yield* Commit).rebuild;
	expect(yield* answered(app.api.voyages.byId({ id: VOYAGE }), "the voyage to be read")).toMatchObject({ quietedAt: expect.any(String) });
	yield* app.api.voyages.resume({ id: VOYAGE });
	yield* (yield* Commit).rebuild;
	expect(yield* answered(app.api.voyages.byId({ id: VOYAGE }), "the voyage to be read")).toMatchObject({ quietedAt: null });
});

it.app("a hold the fleet and a quiet voyage share is listed under the switch that governs it", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* chartered(app);
	yield* app.api.agents.workNow({ requestId: CREW, pieceId: PIECE });
	yield* atWork(CREW, 0);
	yield* app.api.settings.setFlag({ key: "resumePieces", on: false });
	yield* app.api.pieces.launch({ id: PIECE });
	yield* app.api.voyages.quiet({ id: VOYAGE });
	const shared = yield* eventually(
		app.api.holds.queues({}),
		(view) => view.queues.some((queue) => queue.waiting.length === 1),
		"the piece to wait on its switch",
	);
	expect(shared.queues).toMatchObject([{ setting: "resumePieces", held: true, waiting: [{ id: PIECE }] }]);
	expect(shared.quieted).toMatchObject([{ id: VOYAGE, waiting: [] }]);

	yield* app.api.settings.setFlag({ key: "resumePieces", on: true });
	const moved = yield* eventually(
		app.api.holds.queues({}),
		(view) => view.quieted.some((held) => held.waiting.length === 1),
		"the piece to move to the voyage that holds it",
	);
	expect(moved.queues).toEqual([]);
	expect(moved.quieted).toMatchObject([{ id: VOYAGE, waiting: [{ id: PIECE }] }]);
});

it.app("a smoother Antumbra asks for waits until the voyage resumes", function* (app) {
	yield* opened(app);
	yield* app.api.boards.write({ board: voyageBoard(VOYAGE), body: "The tide turned", register: "rough", author: null });
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* smoothing(prepare);
	yield* app.api.boards.requestSmoothing({ voyageId: VOYAGE, pieceId: null, throughToday: true, by: "antumbra", requestId: Request.make("pass") });
	yield* app.settle();
	expect(yield* answered(app.api.boards.smoothingState({ voyageId: VOYAGE }), "the voyage's smoothing state")).toMatchObject({ uncovered: 1 });
	const queues = yield* answered(app.api.holds.queues({}), "the hold queues to be listed");
	expect(queues.quieted).toMatchObject([{ id: VOYAGE, waiting: [{ title: "The day's board" }] }]);

	yield* app.api.voyages.resume({ id: VOYAGE });
	yield* eventually(
		app.api.boards.smoothingState({ voyageId: VOYAGE }),
		(state) => state.state === "idle" && state.uncovered === 0,
		"the smoothing to finish",
	);
});
