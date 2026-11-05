import { type App, answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import { FLAGSHIP_REQUEST, VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Sessions } from "@antumbra/server-sessions/service.ts";
import { selection as messageSelection } from "@antumbra/server-storage/records/message.ts";
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
const begin = (app: App) =>
	Effect.gen(function* () {
		const agentsService = yield* Agents;

		yield* agentsService.spawn({ requestId: asked, role: "hand", backend: "claude", model: null, effort: null });
		yield* app.observe(observed, {
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
	const sessionsService = yield* Sessions;

	yield* begin(app);
	yield* sessionsService.callTool({
		requestId: Request.make("called"),
		sessionId,
		callId: context.callId,
		name: request.spec.name,
		input: JSON.stringify(input),
	});
	yield* rulingReconciliation;
	const waiting = yield* request.invoke(context, input).pipe(Effect.forkChild);
	yield* eventually(app.api.rulings.open({}), (rows) => rows.length === 1, "one open ruling to be listed");
	expect(yield* answered(app.api.rulings.delivery({}), "the ruling deliveries to be read")).toEqual([]);

	const rulingId = RulingId.make(requestId(context));
	yield* app.api.rulings.answer({ rulingId, answer: "Take the north", choiceId: null, by: "admiral", byAgentId: null });
	expect(yield* Fiber.join(waiting)).toMatchObject({ ok: true, text: expect.stringContaining("your hold is over") });
	expect(yield* answered(app.api.rulings.delivery({}), "the ruling deliveries to be read")).toEqual([]);
	expect(
		(yield* app.rows.message
			.findMany({ where: {}, orderBy: { field: "sent_order", direction: "asc" }, select: messageSelection })
			.pipe(Effect.orDie)).filter((message) => message.id === `ruling:${rulingId}`),
	).toEqual([]);
});

it.app("parking releases the tool without generating a duplicate notice", function* (app) {
	const sessionsService = yield* Sessions;

	yield* begin(app);
	yield* sessionsService.callTool({
		requestId: Request.make("called"),
		sessionId,
		callId: context.callId,
		name: request.spec.name,
		input: JSON.stringify(input),
	});
	const waiting = yield* request.invoke(context, input).pipe(Effect.forkChild);
	yield* eventually(app.api.rulings.open({}), (rows) => rows.length === 1, "one open ruling to be listed");
	yield* app.api.rulings.park({ rulingId: RulingId.make(requestId(context)), note: "Wait for daylight" });
	expect(yield* Fiber.join(waiting)).toMatchObject({ ok: true, text: expect.stringContaining("Wait for daylight") });
	yield* sessionsService.answerTool({
		requestId: Request.make("answered"),
		sessionId,
		callId: context.callId,
		name: request.spec.name,
		input: JSON.stringify(input),
		answer: { ok: true, text: "parked" },
	});
	expect(yield* answered(app.api.rulings.delivery({}), "the ruling deliveries to be read")).toEqual([]);
	expect(yield* answered(app.api.rulings.open({}), "the open rulings to be listed")).toHaveLength(1);
});

it.app("delivers a nonblocking answer once as priority mail", function* (app) {
	yield* begin(app);
	yield* rulingReconciliation;
	expect(yield* request.invoke(context, { ...input, urgency: "pressing" })).toMatchObject({ ok: true });
	const rulingId = RulingId.make(requestId(context));
	yield* app.api.rulings.answer({ rulingId, answer: "Take the north", choiceId: null, by: "admiral", byAgentId: null });
	yield* eventually(
		app.api.rulings.byId({ id: rulingId }),
		(found) => Option.isSome(found) && found.value.deliveredAt !== null,
		"the ruling to be delivered",
	);
	const notices = (yield* app.rows.message
		.findMany({ where: {}, orderBy: { field: "sent_order", direction: "asc" }, select: messageSelection })
		.pipe(Effect.orDie)).filter((message) => message.id === `ruling:${rulingId}`);
	expect(notices).toMatchObject([{ precedence: "priority", toAgentId: context.agentId, body: expect.stringContaining("Take the north") }]);
	expect(yield* answered(app.api.rulings.delivery({}), "the ruling deliveries to be read")).toEqual([]);
});

it.app("asks the blocking requester for context and holds their reply until the ruling", function* (app) {
	const sessionsService = yield* Sessions;

	yield* begin(app);

	yield* sessionsService.callTool({
		requestId: Request.make("first-call"),
		sessionId,
		callId: context.callId,
		name: request.spec.name,
		input: JSON.stringify(input),
	});
	const waiting = yield* request.invoke(context, input).pipe(Effect.forkChild);
	yield* eventually(app.api.rulings.open({}), (rows) => rows.length === 1, "one open ruling to be listed");
	const rulingId = RulingId.make(requestId(context));
	yield* app.api.rulings.addContext({ rulingId, authorAgentId: null, body: "How deep is north?" });
	expect(yield* Fiber.join(waiting)).toMatchObject({ ok: true, text: expect.stringContaining("How deep is north?") });
	yield* sessionsService.answerTool({
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
	yield* sessionsService.callTool({
		requestId: Request.make("reply-call"),
		sessionId,
		callId: replyContext.callId,
		name: replyTool.spec.name,
		input: JSON.stringify(replyInput),
	});
	const reply = yield* replyTool.invoke(replyContext, replyInput).pipe(Effect.forkChild);
	yield* eventually(
		app.api.rulings.byId({ id: rulingId }),
		(found) => Option.isSome(found) && found.value.contexts.length === 2,
		"the ruling to carry two contexts",
	);
	yield* app.api.rulings.answer({ rulingId, answer: "Take the north", choiceId: null, by: "admiral", byAgentId: null });
	expect(yield* Fiber.join(reply)).toMatchObject({ ok: true, text: expect.stringContaining("your hold is over") });
	expect(yield* answered(app.api.rulings.delivery({}), "the ruling deliveries to be read")).toEqual([]);
});

it.app("waits for a missing flagship captain and delivers the ascent once they are hailed", function* (app) {
	const agentsService = yield* Agents;

	yield* begin(app);
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
	expect(yield* answered(app.api.rulings.delivery({}), "the ruling deliveries to be read")).toEqual([]);
	yield* rulingReconciliation;
	const captain = Request.make("captain");
	yield* agentsService.hail({ requestId: captain, voyageId: VoyageId.make(FLAGSHIP_REQUEST), by: "agent" });
	const captainId = identity(captain).agentId;
	yield* eventually(app.api.mail.mailbox({ agentId: captainId }), (messages) => messages.length === 1, "one message in the captain's mailbox");
	expect(
		yield* app.rows.message
			.findMany({ where: { toAgentId: captainId }, orderBy: { field: "sent_order", direction: "asc" }, select: messageSelection })
			.pipe(Effect.orDie),
	).toMatchObject([{ id: `ruling-ascent:ascent:${captainId}`, precedence: "priority" }]);
	expect(yield* answered(app.api.rulings.delivery({}), "the ruling deliveries to be read")).toEqual([]);
});
