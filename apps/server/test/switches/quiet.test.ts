import { type App, answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { lifecycleClient } from "@antumbra/app-testing/lifecycle.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { hailWords } from "@antumbra/platform-prompts/hail.ts";
import { mailWords } from "@antumbra/platform-prompts/mail.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { chartered, crewed, opened, PIECE, RUNNER, VOYAGE } from "#test/switches/kit.ts";
import { hailCaptain } from "#tools/voyages/hail.ts";

const CREW = Request.make("crew");
const CAPTAIN = Request.make("captain");
const MAIL = Request.make("mail");
const BAR = VoyageId.make("bar");
const BAR_PIECE = PieceId.make("bar-sounding");
const BAR_CREW = Request.make("bar-crew");
const HAND = { agentId: "hand", sessionId: "hand-root", callId: "hail" };

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

it.app("an agent's hail to a quieted voyage's captain lands as mail", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* app.api.agents.hail({ by: "admiral", requestId: CAPTAIN, voyageId: VOYAGE });
	const captain = yield* atWork(CAPTAIN, 0);
	yield* app.api.voyages.quiet({ id: VOYAGE });
	const answer = yield* hailCaptain.invoke(HAND, { voyageId: VOYAGE });
	expect(answer.ok).toBe(true);
	expect(yield* answered(app.api.mail.mailbox({ agentId: captain.agentId }), "the captain's mailbox")).toMatchObject([{ body: hailWords }]);
	yield* app.settle();
	expect(yield* answered(app.api.sessions.operations({ sessionId: captain.sessionId }), "the captain's operations")).toEqual([]);
});

it.app("the admiral's hail wakes a quieted voyage's captain and leaves the voyage quiet", function* (app) {
	const { atWork } = yield* crewed(app);
	yield* opened(app);
	yield* app.api.agents.hail({ by: "admiral", requestId: CAPTAIN, voyageId: VOYAGE });
	const captain = yield* atWork(CAPTAIN, 0);
	yield* app.api.voyages.quiet({ id: VOYAGE });
	yield* app.api.agents.hail({ by: "admiral", requestId: Request.make("second"), voyageId: VOYAGE });
	const woken = yield* eventually(app.api.sessions.operations({ sessionId: captain.sessionId }), (held) => held.length === 1, "the admiral's wake");
	expect(woken).toMatchObject([{ kind: "wake", reason: "hail" }]);
	expect(yield* answered(app.api.voyages.byId({ id: VOYAGE }), "the voyage to be read")).toMatchObject({ quietedAt: expect.any(String) });
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
