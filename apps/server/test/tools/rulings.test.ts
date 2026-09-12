import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { hail } from "@antumbra/domain-agents/commands/hail.ts";
import { spawn } from "@antumbra/domain-agents/commands/spawn.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import { answerTool } from "@antumbra/domain-sessions/commands/answer-tool.ts";
import { callTool } from "@antumbra/domain-sessions/commands/call-tool.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { FLAGSHIP_REQUEST, VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect, Fiber, Option } from "effect";
import { expect } from "vitest";
import { rulingReconciliation } from "#tools/rulings/reconciliation.ts";
import { commonRulingTools } from "#tools/rulings/tools.ts";

const asked = Request.make("asker");
const { agentId, sessionId } = identity(asked);
const context = { sessionId, callId: "question", agentId };
const input = {
	question: "Which passage?",
	context: "The north is deeper",
	radius: "piece",
	urgency: "blocking",
	recommendation: { choice: "North", reasoning: "It is deeper" },
};
const begin = Effect.gen(function* () {
	const commit = yield* Commit;
	yield* commit.commit(spawn, { requestId: asked, role: "hand", backend: "claude", model: null, effort: null });
	yield* commit.observe(observed, {
		logId: "runner",
		cursor: 0,
		at: 100,
		requestId: Request.make("start"),
		payload: {
			live: true,
			sessionId,
			nodeRef: null,
			origin: null,
			operationId: "start",
			evidence: {
				type: "started",
				agentId: context.agentId,
				backend: "scripted",
				cwd: "/berth",
				nativeRef: "native",
				runnerId: "runner",
				toolSetVersion: "tools",
			},
		},
	});
});
const request = commonRulingTools[0];

it.app("holds a blocking tool until answered and does not duplicate its answer as mail", function* (app) {
	yield* begin;
	yield* (yield* Commit).commit(callTool, {
		requestId: Request.make("called"),
		sessionId,
		callId: context.callId,
		name: request.spec.name,
		input: JSON.stringify(input),
	});
	yield* rulingReconciliation;
	const waiting = yield* request.invoke(context, input).pipe(Effect.forkChild);
	yield* eventually(app.api.rulings.open({}), (rows) => rows.length === 1);
	expect(yield* answered(app.api.rulings.delivery({}))).toEqual([]);

	const rulingId = RulingId.make(requestId(context));
	yield* app.api.rulings.answer({ rulingId, answer: "Take the north", choiceId: null, by: "admiral", byAgentId: null });
	expect(yield* Fiber.join(waiting)).toMatchObject({ ok: true, text: expect.stringContaining("your hold is over") });
	expect(yield* answered(app.api.rulings.delivery({}))).toEqual([]);
	expect((yield* app.rows.message.where({})).filter((message) => message.id === `ruling:${rulingId}`)).toEqual([]);
});

it.app("parking releases the tool without generating a duplicate notice", function* (app) {
	yield* begin;
	yield* (yield* Commit).commit(callTool, {
		requestId: Request.make("called"),
		sessionId,
		callId: context.callId,
		name: request.spec.name,
		input: JSON.stringify(input),
	});
	const waiting = yield* request.invoke(context, input).pipe(Effect.forkChild);
	yield* eventually(app.api.rulings.open({}), (rows) => rows.length === 1);
	yield* app.api.rulings.park({ rulingId: RulingId.make(requestId(context)), note: "Wait for daylight" });
	expect(yield* Fiber.join(waiting)).toMatchObject({ ok: true, text: expect.stringContaining("Wait for daylight") });
	yield* (yield* Commit).commit(answerTool, {
		requestId: Request.make("answered"),
		sessionId,
		callId: context.callId,
		name: request.spec.name,
		input: JSON.stringify(input),
		answer: { ok: true, text: "parked" },
	});
	expect(yield* answered(app.api.rulings.delivery({}))).toEqual([]);
	expect(yield* answered(app.api.rulings.open({}))).toHaveLength(1);
});

it.app("delivers a nonblocking answer once as priority mail", function* (app) {
	yield* begin;
	yield* rulingReconciliation;
	expect(yield* request.invoke(context, { ...input, urgency: "pressing" })).toMatchObject({ ok: true });
	const rulingId = RulingId.make(requestId(context));
	yield* app.api.rulings.answer({ rulingId, answer: "Take the north", choiceId: null, by: "admiral", byAgentId: null });
	yield* eventually(app.api.rulings.byId({ id: rulingId }), (found) => Option.isSome(found) && found.value.deliveredAt !== null);
	const notices = (yield* app.rows.message.where({})).filter((message) => message.id === `ruling:${rulingId}`);
	expect(notices).toMatchObject([{ precedence: "priority", toAgentId: context.agentId, body: expect.stringContaining("Take the north") }]);
	expect(yield* answered(app.api.rulings.delivery({}))).toEqual([]);
});

it.app("asks the blocking requester for context and holds their reply until the ruling", function* (app) {
	yield* begin;
	const commit = yield* Commit;
	yield* commit.commit(callTool, {
		requestId: Request.make("first-call"),
		sessionId,
		callId: context.callId,
		name: request.spec.name,
		input: JSON.stringify(input),
	});
	const waiting = yield* request.invoke(context, input).pipe(Effect.forkChild);
	yield* eventually(app.api.rulings.open({}), (rows) => rows.length === 1);
	const rulingId = RulingId.make(requestId(context));
	yield* app.api.rulings.addContext({ rulingId, authorAgentId: null, body: "How deep is north?" });
	expect(yield* Fiber.join(waiting)).toMatchObject({ ok: true, text: expect.stringContaining("How deep is north?") });
	yield* commit.commit(answerTool, {
		requestId: Request.make("first-answer"),
		sessionId,
		callId: context.callId,
		name: request.spec.name,
		input: JSON.stringify(input),
		answer: { ok: true, text: "asked" },
	});
	const replyContext = { ...context, callId: "reply" };
	const replyInput = { rulingId, context: "Ten fathoms" };
	const replyTool = commonRulingTools[1];
	yield* commit.commit(callTool, {
		requestId: Request.make("reply-call"),
		sessionId,
		callId: replyContext.callId,
		name: replyTool.spec.name,
		input: JSON.stringify(replyInput),
	});
	const reply = yield* replyTool.invoke(replyContext, replyInput).pipe(Effect.forkChild);
	yield* eventually(app.api.rulings.byId({ id: rulingId }), (found) => Option.isSome(found) && found.value.contexts.length === 2);
	yield* app.api.rulings.answer({ rulingId, answer: "Take the north", choiceId: null, by: "admiral", byAgentId: null });
	expect(yield* Fiber.join(reply)).toMatchObject({ ok: true, text: expect.stringContaining("your hold is over") });
	expect(yield* answered(app.api.rulings.delivery({}))).toEqual([]);
});

it.app("waits for a missing flagship captain and delivers the ascent once they are hailed", function* (app) {
	yield* begin;
	yield* app.api.rulings.request({
		requestId: Request.make("ascent"),
		requester: { kind: "agent", agentId: context.agentId },
		rung: "flagship",
		question: "Which passage?",
		context: "The north is deeper",
		radius: "voyage",
		urgency: "pressing",
		choices: [],
		subjects: [],
		gates: [],
		recommendation: null,
	});
	expect(yield* answered(app.api.rulings.delivery({}))).toEqual([]);
	yield* rulingReconciliation;
	const captain = Request.make("captain");
	yield* (yield* Commit).commit(hail, { requestId: captain, voyageId: VoyageId.make(FLAGSHIP_REQUEST) });
	const captainId = identity(captain).agentId;
	yield* eventually(app.api.mail.mailbox({ agentId: captainId }), (messages) => messages.length === 1);
	expect(yield* app.rows.message.where({ toAgentId: captainId })).toMatchObject([
		{ id: `ruling-ascent:ascent:${captainId}`, precedence: "priority" },
	]);
	expect(yield* answered(app.api.rulings.delivery({}))).toEqual([]);
});
