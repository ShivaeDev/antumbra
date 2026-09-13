import { knownModels } from "@antumbra/app-testing/backends.ts";
import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { inputApi } from "@antumbra/app-testing/inputs.ts";
import { lifecycleClient } from "@antumbra/app-testing/lifecycle.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { SessionId, SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { hailWords } from "@antumbra/platform-prompts/hail.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { berth } from "#test/sessions-stop.ts";
import { hailCaptain } from "#tools/voyages/hail.ts";

const voyageId = VoyageId.make("reef");
const pieceId = PieceId.make("survey");
const WORKER = Request.make("agent:survey");
const CAPTAIN = Request.make("agent:captain");
const HAND = Request.make("agent:hand");
const INPUT = SessionInputId.make("00000000-0000-4000-8000-000000000001");

const opening = {
	requestId: Request.make(voyageId),
	name: "Reef",
	northStar: "Safe passage",
	context: "Uncharted",
	kind: "voyage" as const,
	captainBackend: null,
	captainModel: null,
	captainEffort: null,
	crewBackend: null,
	crewModel: null,
	crewEffort: null,
};

const wakes = (operations: readonly { readonly kind: string }[]) => operations.filter((operation) => operation.kind === "wake");

it.app("a stopped session keeps its ready piece until you send to it", function* (app) {
	yield* knownModels(app.api, "claude", "opus");
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter({
		requestId: Request.make(pieceId),
		voyageId,
		title: "Survey",
		charter: "Sound the reef",
		expectation: "A chart",
		role: "crew",
		dependsOn: [],
	});
	yield* app.api.agents.workNow({ requestId: WORKER, pieceId });
	const { agentId, sessionId } = identity(WORKER);
	const quay = yield* berth(app);
	yield* quay.open(0, WORKER, agentId, sessionId);
	yield* quay.stop(2, sessionId);
	yield* eventually(app.api.agents.reading({ id: agentId }), (held) => held?.state === "stopped");
	yield* app.api.pieces.launch({ id: pieceId });
	expect((yield* answered(app.api.agents.dispatch({}))).ready).toEqual([]);
	expect(wakes(yield* answered(app.api.sessions.operations({ sessionId })))).toEqual([]);

	const inputs = yield* inputApi;
	yield* Effect.forkScoped(inputs.submit({ id: INPUT, sessionId, parts: [{ type: "text", text: "Carry on with the survey" }] }));
	yield* eventually(app.api.sessions.reading({ id: sessionId }), (held) => held?.stoppedAt === null);
	const delivery = (yield* eventually(app.api.sessions.operations({ sessionId }), (operations) =>
		operations.some((operation) => operation.inputId === INPUT),
	)).find((operation) => operation.inputId === INPUT);
	if (delivery === undefined) return yield* Effect.die("The message never reached the session");
	yield* quay.append(6, { type: "InputAccepted", sessionId, requestId: delivery.id, inputId: INPUT });
	yield* quay.rest(7, sessionId);
	const resumed = yield* eventually(app.api.sessions.operations({ sessionId }), (operations) => wakes(operations).length === 1);
	expect(wakes(resumed)).toMatchObject([{ reason: `Resume assigned piece ${pieceId}`, status: "requested" }]);
});

it.app("mail reaches a stopped agent's board but never wakes it", function* (app) {
	const quay = yield* berth(app);
	const { agentId, sessionId } = yield* quay.spawn(HAND, "hand");
	yield* quay.stop(2, sessionId);
	yield* app.api.mail.send({
		requestId: Request.make("mail:shoal"),
		toAgentId: agentId,
		authorAgentId: null,
		body: "the shoal is closed to deep draught",
		precedence: "priority",
	});
	expect((yield* answered(app.api.mail.dueWakes({}))).wakes).toEqual([]);
	expect(wakes(yield* answered(app.api.sessions.operations({ sessionId })))).toEqual([]);
	expect(yield* answered(app.api.mail.unread({ agentId }))).toMatchObject([{ deliveredAt: null, readAt: null }]);
});

it.app("the tray counts a stopped session until its turn ends", function* (app) {
	const quay = yield* berth(app);
	const { agentId, sessionId } = yield* quay.spawn(HAND, "hand");
	expect(yield* answered(app.api.agents.workingCount({}))).toBe(1);
	yield* app.api.sessions.stop({
		requestId: Request.make("stop"),
		sessionId: SessionId.make(sessionId),
		reason: "admiral",
		requestedAt: new Date(2).toISOString(),
	});
	expect(yield* answered(app.api.agents.reading({ id: agentId }))).toMatchObject({ canInterrupt: false, state: "stopped" });
	expect(yield* answered(app.api.agents.workingCount({}))).toBe(1);
	yield* quay.append(2, { type: "SessionInterrupted", sessionId, requestId: "stop" });
	yield* quay.rest(3, sessionId);
	expect(yield* eventually(app.api.agents.workingCount({}), (count) => count === 0)).toBe(0);
});

it.app("a restart does not wake a session you stopped", function* (app) {
	const quay = yield* berth(app);
	const { sessionId } = yield* quay.spawn(HAND, "hand");
	yield* app.api.sessions.stop({
		requestId: Request.make("stop"),
		sessionId: SessionId.make(sessionId),
		reason: "admiral",
		requestedAt: new Date(2).toISOString(),
	});
	const lifecycle = yield* lifecycleClient;
	yield* lifecycle("lifecycle.recordRestart", { requestId: "record" });
	expect(yield* answered(app.api.lifecycle.pending({}))).toEqual([sessionId]);
	yield* quay.append(2, { type: "SessionInterrupted", sessionId, requestId: "stop" });
	yield* quay.rest(3, sessionId);
	yield* lifecycle("lifecycle.honorRestart", { requestId: "honor" });
	expect(wakes(yield* answered(app.api.sessions.operations({ sessionId })))).toEqual([]);
});

it.app("an agent's hail to a stopped captain lands as mail, and your own hail resumes it", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.agents.hail({ requestId: CAPTAIN, voyageId, by: "admiral" });
	const { agentId, sessionId } = identity(CAPTAIN);
	const quay = yield* berth(app);
	yield* quay.open(0, CAPTAIN, agentId, sessionId);
	yield* quay.stop(2, sessionId);
	const answer = yield* hailCaptain.invoke({ agentId: "flagship", sessionId: "flagship-root", callId: "hail" }, { voyageId });
	expect(answer.ok).toBe(true);
	expect(yield* answered(app.api.mail.unread({ agentId }))).toMatchObject([{ body: hailWords, precedence: "priority" }]);
	expect(wakes(yield* answered(app.api.sessions.operations({ sessionId })))).toEqual([]);

	yield* app.api.agents.hail({ requestId: Request.make("hail-again"), voyageId, by: "admiral" });
	expect(yield* answered(app.api.sessions.reading({ id: sessionId }))).toMatchObject({ stoppedAt: null });
	expect(wakes(yield* answered(app.api.sessions.operations({ sessionId })))).toMatchObject([{ reason: "hail", status: "requested" }]);
});

it.app("an operation that waited on capacity is not retried into a stopped session", function* (app) {
	const quay = yield* berth(app);
	const { sessionId } = yield* quay.spawn(HAND, "hand");
	yield* quay.append(2, {
		type: "CapacityObserved",
		backend: "claude",
		status: "blocked",
		reason: "usage-limit",
		detail: "Provider window exhausted",
		observedAt: 1,
		resetsAt: null,
		utilization: 1,
	});
	yield* app.api.sessions.request({
		requestId: Request.make("wake"),
		sessionId: SessionId.make(sessionId),
		kind: "wake",
		inputId: null,
		reason: "mail",
		requestedAt: new Date(2).toISOString(),
	});
	yield* eventually(app.api.sessions.operations({ sessionId }), (operations) => operations.some((operation) => operation.status === "waiting"));
	yield* quay.stop(3, sessionId);
	const refused = yield* Effect.flip(app.api.sessions.retry({ id: SessionOperationId.make("wake") }));
	expect(refused).toMatchObject({ _tag: "Unavailable", message: "The session is stopped" });
});
